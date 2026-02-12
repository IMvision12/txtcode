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

    // Use Primary LLM to classify the message
    console.log('🤔 Analyzing message intent...');
    const intent = await this.classifyIntent(message.text);

    if (intent === 'code') {
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

  private async classifyIntent(text: string): Promise<'chat' | 'code'> {
    try {
      // Use Primary LLM to classify the intent
      const classificationPrompt = `You are a message classifier for a coding assistant. Classify the following message as either "chat" or "code".

Rules:
- "chat": General questions, greetings, explanations, discussions, "what is X", "how does X work", "which model", "who are you"
- "code": Actual coding tasks that require file operations, code execution, or project modifications

Examples:
- "hi" → chat
- "what is Python?" → chat
- "which model are you?" → chat
- "explain async/await" → chat
- "create a file named app.py" → code
- "fix the bug in main.js" → code
- "run the script" → code
- "add a new feature to the project" → code

Message: "${text}"

Respond with ONLY one word: "chat" or "code"`;

      const result = await this.aiProcessor.process(classificationPrompt);
      const classification = result.toLowerCase().trim();
      
      // Parse the response
      if (classification.includes('code')) {
        return 'code';
      } else {
        return 'chat';
      }
    } catch (error) {
      // Fallback to simple keyword matching if classification fails
      console.log('⚠️ Classification failed, using fallback logic');
      return this.isCodingTask(text) ? 'code' : 'chat';
    }
  }

  private isCodingTask(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Exclude common non-coding questions
    const nonCodingPatterns = [
      /^(hi|hello|hey|greetings)/,
      /what (is|are|does|do|can)/,
      /how (are|do|does|can)/,
      /tell me about/,
      /explain/,
      /which (model|version|ai)/,
      /who are you/,
      /what('s| is) your/,
      /^(thanks|thank you|ok|okay|yes|no|sure)/
    ];

    // If it matches non-coding patterns, it's NOT a coding task
    if (nonCodingPatterns.some(pattern => pattern.test(lowerText))) {
      return false;
    }
    
    // Keywords that indicate coding tasks (must be action-oriented)
    const codingKeywords = [
      // File operations (action verbs)
      'create file', 'make file', 'write file', 'generate file',
      'delete file', 'remove file', 'modify file', 'edit file',
      'create a', 'make a', 'write a', 'build a',
      
      // Code operations (action verbs)
      'implement', 'refactor', 'optimize', 'debug', 'fix bug',
      'add function', 'add method', 'add class', 'add feature',
      'update code', 'change code', 'modify code',
      
      // Execution
      'run ', 'execute ', 'compile ', 'test ',
      'install ', 'setup ', 'configure ',
      
      // File types with actions
      'create .', 'make .', 'write .',
      'in .py', 'in .js', 'in .ts', 'in .java',
      
      // Project structure
      'new project', 'new app', 'new script'
    ];

    // Check if any coding keyword is present
    const hasCodingKeyword = codingKeywords.some(keyword => 
      lowerText.includes(keyword)
    );

    // Additional patterns (must be specific)
    const hasCodePattern = 
      /create.*\.(py|js|ts|java|cpp|c|html|css|json|xml|yaml|yml|md|txt|sh|bat)/.test(lowerText) || // Create with extension
      /```/.test(text) || // Code blocks
      /(^|\s)(import |from |def |function |class |const |let |var )/.test(lowerText); // Code syntax at word boundaries

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
