import { randomUUID } from "crypto";
import path from "path";
import { logger } from "../shared/logger";
import { AdapterConfig, BaseAdapter } from "./base-adapter";

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

  async connect(): Promise<void> {
    await super.connect();
    logger.debug(`   Model: ${this.claudeModel}`);
    logger.debug(`   Mode: Anthropic API`);
  }
}
