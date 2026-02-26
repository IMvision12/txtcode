import { randomUUID } from "crypto";
import path from "path";
import { logger } from "../shared/logger";
import { ModelInfo } from "../shared/types";
import { AdapterConfig, BaseAdapter } from "./base-adapter";

export class OllamaClaudeCodeAdapter extends BaseAdapter {
  private ollamaModel: string;
  private currentSessionId: string | null = null;

  constructor() {
    super();
    this.ollamaModel = process.env.OLLAMA_MODEL || "gpt-oss:20b";
  }

  protected getConfig(): AdapterConfig {
    return {
      cliCommand: "ollama",
      displayName: "Claude Code (via Ollama)",
      installUrl: "https://ollama.com",
      installInstructions: "Please install Ollama first.",
      statusKeywords: ["ollama", "claude"],
      stdinMode: "inherit",
    };
  }

  protected buildArgs(fullInstruction: string): string[] {
    const args: string[] = ["launch", "claude", "--model", this.ollamaModel];
    const claudeArgs: string[] = [];

    if (this.currentSessionId) {
      claudeArgs.push("--resume", this.currentSessionId);
    } else {
      this.currentSessionId = randomUUID();
      claudeArgs.push("--session-id", this.currentSessionId);
    }

    claudeArgs.push("--permission-mode", "bypassPermissions");
    claudeArgs.push(fullInstruction);

    if (claudeArgs.length > 0) {
      args.push("--", ...claudeArgs);
    }

    return args;
  }

  protected async extraConnectChecks(): Promise<void> {
    try {
      const response = await fetch("http://localhost:11434/api/tags");
      if (!response.ok) {
        throw new Error("Ollama not responding");
      }

      const data: any = await response.json();
      const models = data.models || [];

      if (models.length === 0) {
        throw new Error("No models found. Please pull a model first.");
      }

      const modelExists = models.some((m: any) => m.name === this.ollamaModel);
      if (!modelExists) {
        logger.debug(`Model ${this.ollamaModel} not found`);
        logger.debug(`   Available models: ${models.map((m: any) => m.name).join(", ")}`);
        throw new Error(`Model ${this.ollamaModel} not available`);
      }

      logger.debug("Ollama running");
      logger.debug(`Model ${this.ollamaModel} available`);
    } catch (error) {
      throw new Error(
        `Ollama setup failed: ${error instanceof Error ? error.message : "Unknown error"}\n\n` +
          "Make sure:\n" +
          "1. Ollama is running: ollama serve\n" +
          "2. Model is available: ollama list",
        { cause: error },
      );
    }
  }

  protected getStatusText(): string {
    return `Claude Code (via Ollama Launch)
      
Project: ${path.basename(this.projectPath)}
Model: ${this.ollamaModel}
Backend: Ollama (Local)
Cost: Free
Privacy: 100% Local
Session: ${this.currentSessionId || "None"}`;
  }

  async getStatus(): Promise<string> {
    if (!this.connected) {
      return "Not connected. Will connect on first use.";
    }

    try {
      const response = await fetch("http://localhost:11434/api/tags");
      const data: any = await response.json();
      const models = data.models || [];

      return `${this.getStatusText()}
Available models: ${models.length}`;
    } catch {
      return "Ollama service not running. Start with: ollama serve";
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const config = this.getConfig();
      const { exec } = require("child_process");
      await new Promise((resolve, reject) => {
        exec(`${config.cliCommand} --version`, { timeout: 5000 }, (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });

      const response = await fetch("http://localhost:11434/api/tags", {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return false;
      }

      const data: any = await response.json();
      const models = data.models || [];
      return models.some((m: any) => m.name === this.ollamaModel);
    } catch (error) {
      logger.debug(`Ollama health check failed: ${error}`);
      return false;
    }
  }

  getAvailableModels(): ModelInfo[] {
    return this.cachedModels;
  }

  getCurrentModel(): string {
    return this.ollamaModel;
  }

  setModel(modelId: string): void {
    this.ollamaModel = modelId;
    logger.debug(`Ollama model set to: ${modelId}`);
  }

  async connect(): Promise<void> {
    await super.connect();
    await this.fetchOllamaModels();
    logger.debug(`   Model: ${this.ollamaModel}`);
    logger.debug(`   Mode: Ollama Launch`);
  }

  private cachedModels: ModelInfo[] = [];

  private async fetchOllamaModels(): Promise<void> {
    try {
      const response = await fetch("http://localhost:11434/api/tags");
      if (response.ok) {
        const data: any = await response.json();
        const models = data.models || [];
        this.cachedModels = models.map((m: any) => ({
          id: m.name,
          name: m.name,
        }));
      }
    } catch {
      this.cachedModels = [];
    }
  }
}
