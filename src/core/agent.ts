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
    this.configPath = require('path').join(require('os').homedir(), '.agentcode', 'config.json');
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
      // Use Primary LLM to classify the intent with comprehensive examples
      const classificationPrompt = `You are an intent classifier for AgentCode, a messaging-based coding assistant. Classify the user's message as either "chat" or "code".

CLASSIFICATION RULES:

"chat" - General conversation, questions, explanations:
- Greetings: "hi", "hello", "hey there"
- Questions about concepts: "what is Python?", "explain async/await", "how does X work?"
- Questions about the assistant: "which model are you?", "who are you?", "what can you do?"
- Discussions: "tell me about", "I want to learn", "can you explain"
- Comparisons: "difference between X and Y", "which is better"
- General programming questions without action: "what are design patterns?", "best practices for X"
- Acknowledgments: "thanks", "ok", "got it", "yes", "no"

"code" - Actual coding tasks requiring file operations or code execution:
- File creation: "create a file", "make app.py", "generate config.json"
- File modification: "edit main.js", "update the code", "fix the bug in X", "modify function Y"
- File deletion: "delete file.py", "remove old code"
- Code execution: "run script.py", "execute the program", "test the code"
- Project setup: "setup a new project", "initialize app", "install dependencies"
- Debugging: "debug this error", "fix the issue in X file"
- Feature addition: "add a function to X", "implement feature Y"
- Code review: "review my code in X", "check file.py for errors"
- Any message mentioning specific file names with extensions (.py, .js, .ts, etc.)

EDGE CASES:
- "what is in file.py?" → chat (asking about content, not modifying)
- "create a file.py" → code (action to create)
- "how to create a file in Python?" → chat (asking how, not doing it)
- "create a Python file" → code (action, even without specific name)
- "explain the code in main.js" → chat (explanation, not modification)
- "fix the code in main.js" → code (action to fix)
- "what model are you using?" → chat (question about assistant)
- "use model X to create Y" → code (action to create)

EXAMPLES:
User: "hi" → chat
User: "what is Python?" → chat
User: "which model are you?" → chat
User: "explain async/await" → chat
User: "how do I create a file?" → chat
User: "what's in config.json?" → chat
User: "tell me about design patterns" → chat
User: "create a file named app.py" → code
User: "fix the bug in main.js" → code
User: "run the script" → code
User: "add a new feature to the project" → code
User: "make a calculator" → code
User: "delete old files" → code
User: "setup the project" → code

USER MESSAGE: "${text}"

Respond with ONLY ONE WORD: either "chat" or "code"`;

      const result = await this.aiProcessor.process(classificationPrompt);
      const classification = result.toLowerCase().trim();
      
      // Parse the response - look for the keywords
      if (classification.includes('code')) {
        return 'code';
      } else if (classification.includes('chat')) {
        return 'chat';
      } else {
        // If response is unclear, use fallback
        console.log('⚠️ Unclear classification response:', classification);
        return this.isCodingTask(text) ? 'code' : 'chat';
      }
    } catch (error) {
      // Fallback to simple keyword matching if classification fails
      console.log('⚠️ Classification failed, using fallback logic:', error);
      return this.isCodingTask(text) ? 'code' : 'chat';
    }
  }

  private isCodingTask(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Strong indicators it's NOT a coding task (questions/explanations)
    const nonCodingPatterns = [
      /^(hi|hello|hey|greetings|good morning|good evening)/,
      /^what (is|are|does|do|can|will|would)/,
      /^how (are|do|does|can|to|will|would)/,
      /^why (is|are|does|do|can)/,
      /^when (is|are|does|do|can)/,
      /^where (is|are|does|do|can)/,
      /^tell me (about|how|what|why)/,
      /^explain/,
      /^which (model|version|ai|one)/,
      /^who (are|is)/,
      /^what('s| is) (your|the|a)/,
      /^(thanks|thank you|ok|okay|yes|no|sure|got it)/,
      /difference between/,
      /compare/,
      /best practices/,
      /what.*in.*\.(py|js|ts|java)/, // "what is in file.py" - asking about content
    ];

    // If it matches non-coding patterns, it's NOT a coding task
    if (nonCodingPatterns.some(pattern => pattern.test(lowerText))) {
      return false;
    }
    
    // Strong action verbs that indicate coding tasks
    const actionVerbs = [
      'create', 'make', 'build', 'generate', 'write',
      'delete', 'remove', 'erase',
      'modify', 'edit', 'update', 'change', 'alter',
      'fix', 'debug', 'solve', 'repair',
      'add', 'insert', 'append',
      'run', 'execute', 'compile', 'test',
      'install', 'setup', 'configure', 'initialize',
      'implement', 'refactor', 'optimize',
      'deploy', 'publish', 'release'
    ];

    // Check for action verbs followed by coding-related terms
    const hasActionWithTarget = actionVerbs.some(verb => {
      const verbPattern = new RegExp(`\\b${verb}\\b.*(file|code|function|class|method|script|app|project|program|\\.\\w+)`, 'i');
      return verbPattern.test(lowerText);
    });

    if (hasActionWithTarget) {
      return true;
    }

    // Check for file extensions with action context
    const fileExtensionPattern = /\b(create|make|edit|fix|update|delete|run|in|to)\b.*\.(py|js|ts|jsx|tsx|java|cpp|c|html|css|json|xml|yaml|yml|md|txt|sh|bat|go|rs|rb|php|swift|kt)/;
    if (fileExtensionPattern.test(lowerText)) {
      return true;
    }

    // Check for code blocks
    if (/```/.test(text)) {
      return true;
    }

    // Default to chat if uncertain
    return false;
  }

  private getHelpMessage(): string {
    return `🤖 AgentCode Agent

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
