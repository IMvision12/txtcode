import { ClaudeCodeAdapter } from "../adapters/claude-code";
import { CursorAdapter } from "../adapters/cursor-cli";
import { GeminiCodeAdapter } from "../adapters/gemini-cli";
import { KiroAdapter } from "../adapters/kiro-cli";
import { OllamaClaudeCodeAdapter } from "../adapters/ollama-claude-code";
import { CodexAdapter } from "../adapters/openai-codex";
import { OpenCodeAdapter } from "../adapters/opencode";
import { processWithAnthropic } from "../providers/anthropic";
import { processWithGemini } from "../providers/gemini";
import { processWithHuggingFace } from "../providers/huggingface";
import { processWithMiniMax } from "../providers/minimax";
import { processWithMistral } from "../providers/mistral";
import { processWithMoonshot } from "../providers/moonshot";
import { processWithOpenAI } from "../providers/openai";
import { processWithOpenRouter } from "../providers/openrouter";
import { processWithXAI } from "../providers/xai";
import { logger } from "../shared/logger";
import { IDEAdapter, ModelInfo } from "../shared/types";
import { ProcessTool } from "../tools/process";
import { ToolRegistry } from "../tools/registry";
import { TerminalTool } from "../tools/terminal";
import { ContextManager } from "./context-manager";

export const AVAILABLE_ADAPTERS = [
  { id: "claude-code", label: "Claude Code (Anthropic API)" },
  { id: "cursor", label: "Cursor CLI (Headless)" },
  { id: "gemini-code", label: "Gemini Code (Google AI API)" },
  { id: "codex", label: "OpenAI Codex (OpenAI API)" },
  { id: "ollama-claude-code", label: "Claude Code via Ollama (Local)" },
  { id: "kiro", label: "Kiro CLI (AWS)" },
];

export class Router {
  private adapter: IDEAdapter;
  private currentAdapterName: string;
  private provider: string;
  private apiKey: string;
  private model: string;
  private toolRegistry: ToolRegistry;
  private contextManager: ContextManager;
  private pendingHandoff: string | null = null;
  private currentAbortController: AbortController | null = null;

  constructor() {
    this.provider = process.env.AI_PROVIDER || "anthropic";
    this.apiKey = process.env.AI_API_KEY || "";
    this.model = process.env.AI_MODEL || "";

    this.toolRegistry = new ToolRegistry();
    this.toolRegistry.register(new TerminalTool());
    this.toolRegistry.register(new ProcessTool());

    this.contextManager = new ContextManager();

    const ideType = process.env.IDE_TYPE || "";
    this.currentAdapterName = ideType;
    this.contextManager.setCurrentAdapter(ideType);
    this.adapter = this.createAdapter(ideType);
    this.restoreAdapterModel(ideType);
  }

  private createAdapter(ideType: string): IDEAdapter {
    switch (ideType) {
      case "claude-code":
        return new ClaudeCodeAdapter();
      case "cursor":
        return new CursorAdapter();
      case "gemini-code":
        return new GeminiCodeAdapter();
      case "codex":
        return new CodexAdapter();
      case "ollama-claude-code":
        return new OllamaClaudeCodeAdapter();
      case "kiro":
        return new KiroAdapter();
      case "opencode":
        return new OpenCodeAdapter();
      default:
        throw new Error(
          `No coding adapter configured (IDE_TYPE="${ideType}"). Run: txtcode config`,
        );
    }
  }

  async switchAdapter(
    newAdapterName: string,
  ): Promise<{ handoffGenerated: boolean; oldAdapter: string; entryCount: number }> {
    const oldAdapter = this.currentAdapterName;
    const entryCount = this.contextManager.getEntryCount();

    // Generate handoff and save session to disk
    const handoff = this.contextManager.handleSwitch(oldAdapter, newAdapterName);
    this.pendingHandoff = handoff;

    // Disconnect old adapter
    try {
      await this.adapter.disconnect();
    } catch (error) {
      logger.debug(`Error disconnecting old adapter: ${error}`);
    }

    // Create and set new adapter
    this.adapter = this.createAdapter(newAdapterName);
    this.currentAdapterName = newAdapterName;
    this.restoreAdapterModel(newAdapterName);

    logger.debug(`Switched adapter: ${oldAdapter} → ${newAdapterName}`);

    return { handoffGenerated: handoff !== null, oldAdapter, entryCount };
  }

  async routeToChat(instruction: string): Promise<string> {
    if (!this.apiKey) {
      return "[WARN] AI API key not configured. Run: txtcode config";
    }

    if (!this.model) {
      return "[WARN] AI model not configured. Run: txtcode config";
    }

    switch (this.provider) {
      case "anthropic":
        return await processWithAnthropic(instruction, this.apiKey, this.model, this.toolRegistry);
      case "openai":
        return await processWithOpenAI(instruction, this.apiKey, this.model, this.toolRegistry);
      case "gemini":
        return await processWithGemini(instruction, this.apiKey, this.model, this.toolRegistry);
      case "openrouter":
        return await processWithOpenRouter(instruction, this.apiKey, this.model, this.toolRegistry);
      case "moonshot":
        return await processWithMoonshot(instruction, this.apiKey, this.model, this.toolRegistry);
      case "minimax":
        return await processWithMiniMax(instruction, this.apiKey, this.model, this.toolRegistry);
      case "huggingface":
        return await processWithHuggingFace(
          instruction,
          this.apiKey,
          this.model,
          this.toolRegistry,
        );
      case "mistral":
        return await processWithMistral(instruction, this.apiKey, this.model, this.toolRegistry);
      case "xai":
        return await processWithXAI(instruction, this.apiKey, this.model, this.toolRegistry);
      default:
        return `[ERROR] Unsupported AI provider: ${this.provider}. Run: txtcode config`;
    }
  }

  async routeToCode(instruction: string, onProgress?: (chunk: string) => void): Promise<string> {
    // Abort any pending command
    if (this.currentAbortController) {
      logger.debug("Aborting previous command...");
      this.currentAbortController.abort();
    }

    // Create new abort controller for this command
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    try {
      // Track user message
      this.contextManager.addEntry("user", instruction);

      // If there's a pending handoff, pass it as conversationHistory
      let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> | undefined;

      if (this.pendingHandoff) {
        conversationHistory = [{ role: "user", content: this.pendingHandoff }];
        this.pendingHandoff = null;
        logger.debug("Injecting handoff context via conversationHistory parameter");
      }

      const result = await this.adapter.executeCommand(
        instruction,
        conversationHistory,
        signal,
        onProgress,
      );

      // Track assistant response
      this.contextManager.addEntry("assistant", result);

      return result;
    } finally {
      // Clear abort controller after command completes
      if (this.currentAbortController && !signal.aborted) {
        this.currentAbortController = null;
      }
    }
  }

  abortCurrentCommand(): void {
    if (this.currentAbortController) {
      logger.debug("Aborting current command via Router...");
      this.currentAbortController.abort();
      this.currentAbortController = null;

      // Also call adapter's abort method if available
      if (this.adapter.abort) {
        this.adapter.abort();
      }
    }
  }

  async getAdapterStatus(): Promise<string> {
    return await this.adapter.getStatus();
  }

  getProviderName(): string {
    return this.provider;
  }

  getCurrentModel(): string {
    return this.model;
  }

  updateProvider(provider: string, apiKey: string, model: string): void {
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = model;

    // Update environment variables for consistency
    process.env.AI_PROVIDER = provider;
    process.env.AI_API_KEY = apiKey;
    process.env.AI_MODEL = model;

    logger.debug(`Provider updated: ${provider} with model ${model}`);
  }

  getAdapterName(): string {
    return this.currentAdapterName;
  }

  getAvailableAdapters(): typeof AVAILABLE_ADAPTERS {
    return AVAILABLE_ADAPTERS;
  }

  getContextEntryCount(): number {
    return this.contextManager.getEntryCount();
  }

  getAdapterModels(): ModelInfo[] {
    return this.adapter.getAvailableModels();
  }

  getAdapterCurrentModel(): string {
    return this.adapter.getCurrentModel();
  }

  setAdapterModel(modelId: string): void {
    this.adapter.setModel(modelId);
  }

  private restoreAdapterModel(adapterName: string): void {
    try {
      const fs = require("fs");
      const path = require("path");
      const os = require("os");
      const configPath = path.join(os.homedir(), ".txtcode", "config.json");
      if (!fs.existsSync(configPath)) return;
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const savedModel = config.adapterModels?.[adapterName];
      if (savedModel) {
        this.adapter.setModel(savedModel);
        logger.debug(`Restored model ${savedModel} for adapter ${adapterName}`);
      }
    } catch {
      // ignore
    }
  }
}
