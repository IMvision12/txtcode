import { ClaudeCodeSpawnAdapter } from './adapters/claude-code-spawn';

export interface IDEAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeCommand(instruction: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string>;
  getStatus(): Promise<string>;
}

export class IDEBridge {
  private adapter: IDEAdapter;

  constructor() {
    // Use spawn-based Claude Code adapter with Ollama
    this.adapter = new ClaudeCodeSpawnAdapter();
  }

  async executeCommand(instruction: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
    return await this.adapter.executeCommand(instruction, conversationHistory);
  }

  async getStatus(): Promise<string> {
    return await this.adapter.getStatus();
  }
}

