import { IDEBridge } from '../ide/bridge';
import { AIProcessor } from '../ai/processor';

export interface Message {
  from: string;
  text: string;
  timestamp: Date;
}

export class AgentCore {
  private ideBridge: IDEBridge;
  private aiProcessor: AIProcessor;
  private authorizedUser: string | null;
  private configPath: string;

  constructor() {
    this.ideBridge = new IDEBridge();
    this.aiProcessor = new AIProcessor();
    this.authorizedUser = null;
    this.configPath = require('path').join(require('os').homedir(), '.opencode', 'config.json');
    this.loadAuthorizedUser();
  }

  private loadAuthorizedUser() {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        this.authorizedUser = config.authorizedUser || null;
      }
    } catch (error) {
      // Config not found or invalid
    }
  }

  private saveAuthorizedUser(userId: string) {
    try {
      const fs = require('fs');
      const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      config.authorizedUser = userId;
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      this.authorizedUser = userId;
    } catch (error) {
      console.error('Failed to save authorized user:', error);
    }
  }

  isUserAllowed(userId: string): boolean {
    // First message from any user becomes the authorized user
    if (!this.authorizedUser) {
      console.log(`✅ Authorizing first user: ${userId}`);
      this.saveAuthorizedUser(userId);
      return true;
    }
    
    // Only the authorized user can use the agent
    if (this.authorizedUser === userId) {
      return true;
    }
    
    console.log(`⚠️ Rejected unauthorized user: ${userId} (authorized: ${this.authorizedUser})`);
    return false;
  }

  async processMessage(message: Message): Promise<string> {
    // Check authorization first
    if (!this.isUserAllowed(message.from)) {
      // Silently reject - don't send message back
      return '🚫_UNAUTHORIZED_';
    }

    const text = message.text.toLowerCase().trim();

    // Handle basic commands
    if (text === 'help' || text === '/help') {
      return this.getHelpMessage();
    }

    if (text === 'status' || text === '/status') {
      return await this.ideBridge.getStatus();
    }

    // Determine if this is a coding task or general chat
    if (this.isCodingTask(message.text)) {
      // Route to Code Assistant (Claude Code)
      console.log('🔧 Routing to Code Assistant (Claude Code)...');
      try {
        const result = await this.ideBridge.executeCommand(message.text);
        return result;
      } catch (error) {
        return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } else {
      // Route to Primary LLM for general chat
      console.log('💬 Routing to Primary LLM for general chat...');
      try {
        const result = await this.aiProcessor.process(message.text);
        return result;
      } catch (error) {
        return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  }

  private isCodingTask(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Keywords that indicate coding tasks
    const codingKeywords = [
      // File operations
      'create', 'make', 'write', 'generate', 'build',
      'delete', 'remove', 'modify', 'edit', 'update', 'change',
      'rename', 'move', 'copy',
      
      // Code operations
      'code', 'function', 'class', 'method', 'variable',
      'implement', 'refactor', 'optimize', 'debug', 'fix',
      'test', 'run', 'execute', 'compile',
      
      // File types
      'file', '.py', '.js', '.ts', '.java', '.cpp', '.c',
      '.html', '.css', '.json', '.xml', '.yaml', '.yml',
      '.md', '.txt', '.sh', '.bat',
      
      // Programming concepts
      'api', 'endpoint', 'route', 'controller', 'model',
      'component', 'module', 'package', 'library',
      'database', 'query', 'schema', 'migration',
      
      // Actions
      'install', 'setup', 'configure', 'deploy',
      'add feature', 'add function', 'add method',
      'bug', 'error', 'issue', 'problem',
      
      // Project structure
      'project', 'app', 'application', 'script', 'program'
    ];

    // Check if any coding keyword is present
    const hasCodingKeyword = codingKeywords.some(keyword => 
      lowerText.includes(keyword)
    );

    // Additional patterns
    const hasCodePattern = 
      /\.(py|js|ts|java|cpp|c|html|css|json|xml|yaml|yml|md|txt|sh|bat)/.test(lowerText) || // File extensions
      /```/.test(text) || // Code blocks
      /import |from |def |function |class |const |let |var /.test(lowerText); // Code syntax

    return hasCodingKeyword || hasCodePattern;
  }

  private getHelpMessage(): string {
    return `🤖 OpenCode Agent

Available commands:
• help - Show this message
• status - Check IDE connection

💬 General Chat:
Just ask questions and I'll respond using the primary LLM (${process.env.AI_PROVIDER || 'configured provider'})

🔧 Coding Tasks:
• "create a new file..." - File creation
• "fix the bug in..." - Bug fixing
• "add feature..." - Feature development
• "run script.py" - Code execution

The agent automatically routes your message to the right system!`;
  }
}
