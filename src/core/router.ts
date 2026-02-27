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
import { IDEAdapter, MCPServerEntry, ModelInfo } from "../shared/types";
import { CronTool } from "../tools/cron";
import { EnvTool } from "../tools/env";
import { GitTool } from "../tools/git";
import { HttpTool } from "../tools/http";
import { MCPBridge, MCPServerConfig } from "../tools/mcp-bridge";
import { NetworkTool } from "../tools/network";
import { ProcessTool } from "../tools/process";
import { ToolRegistry } from "../tools/registry";
import { SearchTool } from "../tools/search";
import { SysinfoTool } from "../tools/sysinfo";
import { TerminalTool } from "../tools/terminal";
import { loadMCPServersCatalog } from "../utils/mcp-catalog-loader";
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
  private mcpBridge: MCPBridge;

  constructor() {
    this.provider = process.env.AI_PROVIDER || "anthropic";
    this.apiKey = process.env.AI_API_KEY || "";
    this.model = process.env.AI_MODEL || "";

    this.toolRegistry = new ToolRegistry();
    this.toolRegistry.register(new TerminalTool());
    this.toolRegistry.register(new ProcessTool());
    this.toolRegistry.register(new GitTool());
    this.toolRegistry.register(new SearchTool());
    this.toolRegistry.register(new HttpTool());
    this.toolRegistry.register(new EnvTool());
    this.toolRegistry.register(new NetworkTool());
    this.toolRegistry.register(new CronTool());
    this.toolRegistry.register(new SysinfoTool());

    this.mcpBridge = new MCPBridge();
    this.contextManager = new ContextManager();

    const ideType = process.env.IDE_TYPE || "";
    this.currentAdapterName = ideType;
    this.contextManager.setCurrentAdapter(ideType);
    this.adapter = this.createAdapter(ideType);
    this.restoreAdapterModel(ideType);
  }

  async initMCP(): Promise<void> {
    const mcpServers = this.loadMCPConfig();
    if (!mcpServers || mcpServers.length === 0) {
      return;
    }

    const catalog = loadMCPServersCatalog();
    const catalogMap = new Map(catalog.servers.map((s) => [s.id, s]));

    const results: string[] = [];

    for (const entry of mcpServers) {
      if (!entry.enabled) {
        continue;
      }

      try {
        const catalogEntry = catalogMap.get(entry.id);
        const serverConfig = this.buildMCPServerConfig(entry, catalogEntry);

        const tools = await this.mcpBridge.connect(serverConfig);
        this.toolRegistry.registerMCPTools(tools);
        results.push(`${entry.id}: ${tools.length} tools`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.debug(`MCP server "${entry.id}" failed to connect: ${msg}`);
      }
    }

    if (results.length > 0) {
      logger.info(`MCP servers connected (${results.join(", ")})`);
      logger.info(`Total tools: ${this.toolRegistry.getMCPToolCount()} MCP + built-in`);
    }
  }

  private buildMCPServerConfig(
    entry: MCPServerEntry,
    catalogEntry?: {
      keychainKey?: string;
      tokenEnvKey?: string;
      additionalTokens?: Array<{ keychainKey: string; tokenEnvKey: string }>;
    },
  ): MCPServerConfig {
    const config: MCPServerConfig = {
      id: entry.id,
      name: entry.id,
      transport: entry.transport,
    };

    if (entry.transport === "stdio") {
      config.command = entry.command;

      const resolvedArgs = (entry.args || []).map((arg) => {
        const keychainMatch = arg.match(/^__KEYCHAIN:(.+)__$/);
        if (keychainMatch) {
          return process.env[`MCP_TOKEN_${entry.id.toUpperCase().replace(/-/g, "_")}`] || arg;
        }
        return arg;
      });
      config.args = resolvedArgs;

      const env: Record<string, string> = { ...entry.env };
      if (catalogEntry?.tokenEnvKey) {
        const envKey = `MCP_TOKEN_${entry.id.toUpperCase().replace(/-/g, "_")}`;
        const token = process.env[envKey];
        if (token) {
          env[catalogEntry.tokenEnvKey] = token;
        }
      }
      if (catalogEntry?.additionalTokens) {
        for (const additional of catalogEntry.additionalTokens) {
          const envKey = `MCP_TOKEN_${additional.keychainKey.toUpperCase().replace(/-/g, "_")}`;
          const token = process.env[envKey];
          if (token) {
            env[additional.tokenEnvKey] = token;
          }
        }
      }
      config.env = env;
    } else {
      config.url = entry.url;

      const tokenEnvKey = `MCP_TOKEN_${entry.id.toUpperCase().replace(/-/g, "_")}`;
      const token = process.env[tokenEnvKey];
      if (token) {
        config.headers = { Authorization: `Bearer ${token}` };
      }
    }

    return config;
  }

  private loadMCPConfig(): MCPServerEntry[] | null {
    try {
      const fs = require("fs");
      const path = require("path");
      const os = require("os");
      const configPath = path.join(os.homedir(), ".txtcode", "config.json");
      if (!fs.existsSync(configPath)) {
        return null;
      }
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      return config.mcpServers || null;
    } catch {
      return null;
    }
  }

  async shutdownMCP(): Promise<void> {
    for (const serverId of this.mcpBridge.getConnectedServerIds()) {
      this.toolRegistry.removeMCPTools(serverId);
    }
    await this.mcpBridge.disconnectAll();
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

    const trackedFiles = this.adapter.getTrackedFiles();
    const handoff = this.contextManager.handleSwitch(oldAdapter, newAdapterName, trackedFiles);
    this.pendingHandoff = handoff;

    try {
      await this.adapter.disconnect();
    } catch (error) {
      logger.debug(`Error disconnecting old adapter: ${error}`);
    }

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
    if (this.currentAbortController) {
      logger.debug("Aborting previous command...");
      this.currentAbortController.abort();
    }

    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    try {
      this.contextManager.addEntry("user", instruction);

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

      this.contextManager.addEntry("assistant", result);

      return result;
    } finally {
      this.currentAbortController = null;
    }
  }

  abortCurrentCommand(): void {
    if (this.currentAbortController) {
      logger.debug("Aborting current command via Router...");
      this.currentAbortController.abort();
      this.currentAbortController = null;

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
      if (!fs.existsSync(configPath)) {
        return;
      }
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
