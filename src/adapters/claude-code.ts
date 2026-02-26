import { randomUUID } from "crypto";
import path from "path";
import { logger } from "../shared/logger";
import { ModelInfo } from "../shared/types";
import { AdapterConfig, BaseAdapter } from "./base-adapter";

const CLAUDE_MODELS: ModelInfo[] = [
  { id: "sonnet", name: "Claude Sonnet (default)" },
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
  { id: "claude-sonnet-4", name: "Claude Sonnet 4" },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
  { id: "opus", name: "Claude Opus" },
  { id: "haiku", name: "Claude Haiku" },
];

export class ClaudeCodeAdapter extends BaseAdapter {
  private claudeModel: string;
  private currentSessionId: string | null = null;

  constructor() {
    super();
    this.claudeModel = process.env.CLAUDE_MODEL || "sonnet";
  }

  protected getConfig(): AdapterConfig {
    return {
      cliCommand: "claude",
      displayName: "Claude Code (Official)",
      installUrl: "https://claude.ai",
      installInstructions: "Please install Claude CLI first.",
      statusKeywords: ["claude"],
      stdinMode: "inherit",
    };
  }

  protected buildArgs(fullInstruction: string): string[] {
    const args: string[] = [];

    if (this.currentSessionId) {
      args.push("--resume", this.currentSessionId);
    } else {
      this.currentSessionId = randomUUID();
      args.push("--session-id", this.currentSessionId);
    }

    args.push("--permission-mode", "bypassPermissions");
    args.push("--model", this.claudeModel);
    args.push(fullInstruction);

    return args;
  }

  protected getStatusText(): string {
    return `Claude Code (Official)
    
Project: ${path.basename(this.projectPath)}
Model: ${this.claudeModel}
Backend: Anthropic API
Cost: Paid (API usage)
Privacy: Cloud-based
Session: ${this.currentSessionId || "None"}`;
  }

  getAvailableModels(): ModelInfo[] {
    return CLAUDE_MODELS;
  }

  getCurrentModel(): string {
    return this.claudeModel;
  }

  setModel(modelId: string): void {
    this.claudeModel = modelId;
    logger.debug(`Claude Code model set to: ${modelId}`);
  }

  async connect(): Promise<void> {
    await super.connect();
    logger.debug(`   Model: ${this.claudeModel}`);
    logger.debug(`   Mode: Anthropic API`);
  }
}
