import { IDEAdapter } from '../bridge';
import { AIProcessor } from '../../ai/processor';

export class VSCodeAdapter implements IDEAdapter {
  private aiProcessor: AIProcessor;
  private connected: boolean = false;

  constructor() {
    this.aiProcessor = new AIProcessor();
  }

  async connect(): Promise<void> {
    // TODO: Implement VS Code extension API connection
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async executeCommand(instruction: string): Promise<string> {
    try {
      const response = await this.aiProcessor.process(instruction);
      
      // TODO: Execute via VS Code extension
      return response;
    } catch (error) {
      throw new Error(`Failed to execute: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStatus(): Promise<string> {
    return this.connected 
      ? '✅ VS Code connected' 
      : '⚠️ VS Code not connected';
  }
}
