import path from "path";
import { logger } from "../shared/logger";
import { ModelInfo } from "../shared/types";
import { AdapterConfig, BaseAdapter } from "./base-adapter";

const CODEX_MODELS: ModelInfo[] = [
  { id: "gpt-5.3-codex", name: "GPT-5.3 Codex (latest)" },
  { id: "gpt-5.2-codex", name: "GPT-5.2 Codex" },
  { id: "gpt-5.1-codex-max", name: "GPT-5.1 Codex Max" },
  { id: "gpt-5.2", name: "GPT-5.2" },
  { id: "gpt-5.1-codex-mini", name: "GPT-5.1 Codex Mini" },
];

export class CodexAdapter extends BaseAdapter {
  private codexModel: string = "gpt-5.3-codex";
  protected getConfig(): AdapterConfig {
    return {
      cliCommand: "codex",
      displayName: "OpenAI Codex",
      installUrl: "https://github.com/openai/codex",
      installInstructions: "Install it with:\n  npm install -g @openai/codex",
      statusKeywords: ["codex"],
      stdinMode: "pipe",
    };
  }

  protected buildArgs(fullInstruction: string): string[] {
    return [
      "exec",
      "--full-auto",
      "-m",
      this.codexModel,
      "--cd",
      this.projectPath,
      fullInstruction,
    ];
  }

  protected exitCodeIndicatesSuccess(code: number | null, output: string): boolean {
    return code === 0 || output.length > 0;
  }

  protected getStatusText(): string {
    return `OpenAI Codex

Project: ${path.basename(this.projectPath)}
Model: configured in ~/.codex/config.toml
Backend: OpenAI API
Cost: Paid (API usage)
Privacy: Cloud-based (sandboxed execution)
Session: Stateless (per-invocation)`;
  }

  getAvailableModels(): ModelInfo[] {
    return CODEX_MODELS;
  }

  getCurrentModel(): string {
    return this.codexModel;
  }

  setModel(modelId: string): void {
    this.codexModel = modelId;
    logger.debug(`Codex model set to: ${modelId}`);
  }

  async connect(): Promise<void> {
    await super.connect();
    logger.debug(`   Model: ${this.codexModel}`);
    logger.debug(`   Mode: OpenAI API`);
  }
}
