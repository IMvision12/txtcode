import { IDEBridge } from './ide-bridge';
import { processWithAnthropic } from '../services/primary-llm/anthropic';
import { processWithOpenAI } from '../services/primary-llm/openai';
import { processWithGemini } from '../services/primary-llm/gemini';
import { Message } from '../types';

export class AgentCore {
  private ideBridge: IDEBridge;
  private provider: string;
  private apiKey: string;
  private authorizedUser: string | null;
  private configPath: string;
  private userModes: Map<string, 'chat' | 'code'> = new Map(); // Track mode per user

  constructor() {
    this.ideBridge = new IDEBridge();
    this.provider = process.env.AI_PROVIDER || 'anthropic';
    this.apiKey = process.env.AI_API_KEY || '';
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
      console.log(`[AUTH] Authorizing first user: ${userId}`);
      this.saveAuthorizedUser(userId);
      return true;
    }
    
    // Only the authorized user can use the agent
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

All your messages will now be sent to the coding adapter (${process.env.IDE_TYPE || 'ollama-claude-code'}).

To switch back to chat mode, use: /chat`;
    }

    if (lowerText === '/chat') {
      this.userModes.set(message.from, 'chat');
      return `[CHAT MODE] Switched to CHAT mode

All your messages will now be sent to the primary LLM (${this.provider}).

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
      console.log('[CODE] User in CODE mode - routing to coding adapter...');
      try {
        const result = await this.ideBridge.executeCommand(text);
        return result;
      } catch (error) {
        return `[ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } else if (userMode === 'chat') {
      console.log('[CHAT] User in CHAT mode - routing to primary LLM...');
      try {
        const result = await this.processWithAI(text);
        return result;
      } catch (error) {
        return `[ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } else {
      console.log('[CHAT] No mode set - defaulting to primary LLM...');
      try {
        const result = await this.processWithAI(text);
        return result;
      } catch (error) {
        return `[ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  }

  private async processWithAI(instruction: string): Promise<string> {
    if (!this.apiKey) {
      return '[WARN] AI API key not configured. Run: agentcode config';
    }

    try {
      if (this.provider === 'anthropic') {
        return await processWithAnthropic(instruction, this.apiKey);
      } else if (this.provider === 'openai') {
        return await processWithOpenAI(instruction, this.apiKey);
      } else if (this.provider === 'gemini') {
        return await processWithGemini(instruction, this.apiKey);
      }
      
      return `[ERROR] Unsupported AI provider: ${this.provider}`;
    } catch (error) {
      throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getHelpMessage(): string {
    return `AgentCode Agent

Available commands:
• help - Show this message
• status - Check IDE connection
• /code - Switch to CODE mode (all messages go to coding adapter)
• /chat - Switch to CHAT mode (all messages go to primary LLM)

Chat Mode (default):
Messages go to the primary LLM (${this.provider})

Code Mode:
Messages go to the coding adapter (${process.env.IDE_TYPE || 'ollama-claude-code'})

Use /code or /chat to switch modes!`;
  }
}
