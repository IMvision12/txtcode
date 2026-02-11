import { OllamaClaudeCodeAdapter } from './adapters/ollama-claude-code';
import { ClaudeCodeAdapter } from './adapters/claude-code';

export interface IDEAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeCommand(instruction: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string>;
  getStatus(): Promise<string>;
}

export class IDEBridge {
  private adapter: IDEAdapter;

  constructor() {
    const ideType = process.env.IDE_TYPE || 'ollama-claude-code';
    
    switch (ideType) {
      case 'claude-code':
        // Official Claude Code with Anthropic API
        this.adapter = new ClaudeCodeAdapter();
        break;
      case 'ollama-claude-code':
      default:
        // Claude Code via Ollama (local, free)
        this.adapter = new OllamaClaudeCodeAdapter();
        break;
    }
  }

  async executeCommand(instruction: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
    return await this.adapter.executeCommand(instruction, conversationHistory);
  }

  async getStatus(): Promise<string> {
    return await this.adapter.getStatus();
  }
}

