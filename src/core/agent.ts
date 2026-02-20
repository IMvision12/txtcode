import { Router } from './router';
import { Message } from '../shared/types';

export class AgentCore {
  private router: Router;
  private authorizedUser: string | null;
  private configPath: string;
  private userModes: Map<string, 'chat' | 'code'> = new Map();

  constructor() {
    this.router = new Router();
    this.authorizedUser = null;
    this.configPath = require('path').join(require('os').homedir(), '.txtcode', 'config.json');
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
    if (!this.authorizedUser) {
      console.log(`[AUTH] Authorizing first user: ${userId}`);
      this.saveAuthorizedUser(userId);
      return true;
    }
    
    if (this.authorizedUser === userId) {
      return true;
    }
    
    console.log(`[AUTH] Rejected unauthorized user: ${userId} (authorized: ${this.authorizedUser})`);
    return false;
  }

  async processMessage(message: Message): Promise<string> {
    if (!this.isUserAllowed(message.from)) {
      return '[UNAUTHORIZED]';
    }

    const text = message.text.trim();
    const lowerText = text.toLowerCase();

    if (lowerText === '/code') {
      this.userModes.set(message.from, 'code');
      return `[CODE MODE] Switched to CODE mode

All your messages will now be sent to the coding adapter (${this.router.getAdapterName()}).

To switch back to chat mode, use: /chat`;
    }

    if (lowerText === '/chat') {
      this.userModes.set(message.from, 'chat');
      return `[CHAT MODE] Switched to CHAT mode

All your messages will now be sent to the primary LLM (${this.router.getProviderName()}).

To switch to code mode, use: /code`;
    }

    if (lowerText === 'help' || lowerText === '/help') {
      return this.getHelpMessage();
    }

    if (lowerText === 'status' || lowerText === '/status') {
      return await this.router.getAdapterStatus();
    }

    const userMode = this.userModes.get(message.from);

    if (userMode === 'code') {
      console.log('[CODE] User in CODE mode - routing to coding adapter...');
      try {
        return await this.router.routeToCode(text);
      } catch (error) {
        return `[ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } else {
      const modeLabel = userMode === 'chat' ? 'CHAT' : 'CHAT';
      console.log(`[${modeLabel}] Routing to primary LLM...`);
      try {
        return await this.router.routeToChat(text);
      } catch (error) {
        return `[ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  }

  private getHelpMessage(): string {
    return `TxtCode Agent

Available commands:
• help - Show this message
• status - Check IDE connection
• /code - Switch to CODE mode (all messages go to coding adapter)
• /chat - Switch to CHAT mode (all messages go to primary LLM)

Chat Mode (default):
Messages go to the primary LLM (${this.router.getProviderName()}) with terminal tool support.

Code Mode:
Messages go to the coding adapter (${this.router.getAdapterName()})

Use /code or /chat to switch modes!`;
  }
}
