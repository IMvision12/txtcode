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
  private userModes: Map<string, 'chat' | 'code'> = new Map(); // Track mode per user

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
    if (!this.isUserAllowed(message.from)) {
      return '🚫_UNAUTHORIZED_';
    }

    const text = message.text.trim();
    const lowerText = text.toLowerCase();

    if (lowerText === '/code') {
      this.userModes.set(message.from, 'code');
      return `🔧 Switched to CODE mode

All your messages will now be sent to the coding adapter (${process.env.IDE_TYPE || 'ollama-claude-code'}).

To switch back to chat mode, use: /chat`;
    }

    if (lowerText === '/chat') {
      this.userModes.set(message.from, 'chat');
      return `💬 Switched to CHAT mode

All your messages will now be sent to the primary LLM (${process.env.AI_PROVIDER || 'configured provider'}).

To switch to code mode, use: /code`;
    }

    if (lowerText === 'help' || lowerText === '/help') {
      return this.getHelpMessage();
    }

    if (lowerText === 'status' || lowerText === '/status') {
      return await this.ideBridge.getStatus();
    }

    const userMode = this.userModes.get(message.from);

    if (userMode === 'code') {
      console.log('🔧 User in CODE mode - routing to coding adapter...');
      try {
        const result = await this.ideBridge.executeCommand(text);
        return result;
      } catch (error) {
        return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } else if (userMode === 'chat') {
      console.log('💬 User in CHAT mode - routing to primary LLM...');
      try {
        const result = await this.aiProcessor.process(text);
        return result;
      } catch (error) {
        return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } else {
      console.log('💬 No mode set - defaulting to primary LLM...');
      try {
        const result = await this.aiProcessor.process(text);
        return result;
      } catch (error) {
        return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  }

  private getHelpMessage(): string {
    return `🤖 AgentCode Agent

Available commands:
• help - Show this message
• status - Check IDE connection
• /code - Switch to CODE mode (all messages go to coding adapter)
• /chat - Switch to CHAT mode (all messages go to primary LLM)

💬 Chat Mode (default):
Messages go to the primary LLM (${process.env.AI_PROVIDER || 'configured provider'})

🔧 Code Mode:
Messages go to the coding adapter (${process.env.IDE_TYPE || 'ollama-claude-code'})

Use /code or /chat to switch modes!`;
  }
}
