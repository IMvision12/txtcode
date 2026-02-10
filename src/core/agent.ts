import { IDEBridge } from '../ide/bridge';

export interface Message {
  from: string;
  text: string;
  timestamp: Date;
}

export class AgentCore {
  private ideBridge: IDEBridge;
  private authorizedUser: string | null;
  private configPath: string;

  constructor() {
    this.ideBridge = new IDEBridge();
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

    // Process as code instruction
    try {
      const result = await this.ideBridge.executeCommand(message.text);
      return result;
    } catch (error) {
      return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private getHelpMessage(): string {
    return `🤖 OpenCode Agent

Available commands:
• help - Show this message
• status - Check IDE connection
• "create a new file..." - Natural language instructions
• "fix the bug in..." - Bug fixing
• "add feature..." - Feature development

Just describe what you want to do!`;
  }
}
