import { OllamaClaudeCodeAdapter } from './adapters/ollama-claude-code';

export interface IDEAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeCommand(instruction: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string>;
  getStatus(): Promise<string>;
}

export class IDEBridge {
  private adapter: IDEAdapter;

  constructor() {
    // Use Ollama Claude Code adapter
    this.adapter = new OllamaClaudeCodeAdapter();
  }

  async executeCommand(instruction: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
    return await this.adapter.executeCommand(instruction, conversationHistory);
  }

  async getStatus(): Promise<string> {
    return await this.adapter.getStatus();
  }
}

