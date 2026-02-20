import { OllamaClaudeCodeAdapter } from '../adapters/ollama-claude-code';
import { ClaudeCodeAdapter } from '../adapters/claude-code';
import { GeminiCodeAdapter } from '../adapters/gemini-code';
import { CodexAdapter } from '../adapters/openai-codex';
import { processWithAnthropic } from '../providers/anthropic';
import { processWithOpenAI } from '../providers/openai';
import { processWithGemini } from '../providers/gemini';
import { processWithDeepSeek } from '../providers/deepseek';
import { processWithOpenRouter } from '../providers/openrouter';
import { ToolRegistry } from '../tools/registry';
import { TerminalTool } from '../tools/terminal';
import { ProcessTool } from '../tools/process';
import { IDEAdapter } from '../shared/types';

export class Router {
  private adapter: IDEAdapter;
  private provider: string;
  private apiKey: string;
  private model: string;
  private toolRegistry: ToolRegistry;

  constructor() {
    this.provider = process.env.AI_PROVIDER || 'anthropic';
    this.apiKey = process.env.AI_API_KEY || '';
    this.model = process.env.AI_MODEL || '';

    this.toolRegistry = new ToolRegistry();
    this.toolRegistry.register(new TerminalTool());
    this.toolRegistry.register(new ProcessTool());

    const ideType = process.env.IDE_TYPE || '';
    switch (ideType) {
      case 'claude-code':
        this.adapter = new ClaudeCodeAdapter();
        break;
      case 'gemini-code':
        this.adapter = new GeminiCodeAdapter();
        break;
      case 'codex':
        this.adapter = new CodexAdapter();
        break;
      case 'ollama-claude-code':
        this.adapter = new OllamaClaudeCodeAdapter();
        break;
      default:
        throw new Error(
          `No coding adapter configured (IDE_TYPE="${ideType}"). Run: txtcode config`
        );
    }
  }

  async routeToChat(instruction: string): Promise<string> {
    if (!this.apiKey) {
      return '[WARN] AI API key not configured. Run: txtcode config';
    }

    if (!this.model) {
      return '[WARN] AI model not configured. Run: txtcode config';
    }

    switch (this.provider) {
      case 'anthropic':
        return await processWithAnthropic(instruction, this.apiKey, this.model, this.toolRegistry);
      case 'openai':
        return await processWithOpenAI(instruction, this.apiKey, this.model, this.toolRegistry);
      case 'gemini':
        return await processWithGemini(instruction, this.apiKey, this.model, this.toolRegistry);
      case 'deepseek':
        return await processWithDeepSeek(instruction, this.apiKey, this.model, this.toolRegistry);
      case 'openrouter':
        return await processWithOpenRouter(instruction, this.apiKey, this.model, this.toolRegistry);
      default:
        return `[ERROR] Unsupported AI provider: ${this.provider}. Run: txtcode config`;
    }
  }

  async routeToCode(instruction: string): Promise<string> {
    return await this.adapter.executeCommand(instruction);
  }

  async getAdapterStatus(): Promise<string> {
    return await this.adapter.getStatus();
  }

  getProviderName(): string {
    return this.provider;
  }

  getAdapterName(): string {
    return process.env.IDE_TYPE || 'ollama-claude-code';
  }
}
