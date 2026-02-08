import { KiroAdapter } from './adapters/kiro';
import { VSCodeAdapter } from './adapters/vscode';
import { CursorAdapter } from './adapters/cursor';

export interface IDEAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeCommand(instruction: string): Promise<string>;
  getStatus(): Promise<string>;
}

export class IDEBridge {
  private adapter: IDEAdapter;

  constructor() {
    const ideType = process.env.IDE_TYPE || 'kiro';
    
    switch (ideType) {
      case 'kiro':
        this.adapter = new KiroAdapter();
        break;
      case 'vscode':
      case 'cursor':
      case 'windsurf':
        this.adapter = new VSCodeAdapter();
        break;
      default:
        this.adapter = new KiroAdapter();
    }
  }

  async executeCommand(instruction: string): Promise<string> {
    return await this.adapter.executeCommand(instruction);
  }

  async getStatus(): Promise<string> {
    return await this.adapter.getStatus();
  }
}
