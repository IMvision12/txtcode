import { IDEBridge } from '../ide/bridge';

export interface Message {
  from: string;
  text: string;
  timestamp: Date;
}

export class AgentCore {
  private ideBridge: IDEBridge;
  private allowedUsers: Set<string>;

  constructor() {
    this.ideBridge = new IDEBridge();
    this.allowedUsers = new Set(
      (process.env.ALLOWED_USERS || '').split(',').filter(u => u.trim())
    );
  }

  isUserAllowed(userId: string): boolean {
    if (this.allowedUsers.size === 0) return true; // No restrictions if empty
    return this.allowedUsers.has(userId);
  }

  async processMessage(message: Message): Promise<string> {
    if (!this.isUserAllowed(message.from)) {
      return '🚫 Unauthorized. Contact the administrator.';
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
