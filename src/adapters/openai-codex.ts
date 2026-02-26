import path from "path";
import { logger } from "../shared/logger";
import { AdapterConfig, BaseAdapter } from "./base-adapter";

export class CodexAdapter extends BaseAdapter {
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
    return ["exec", "--full-auto", "--cd", this.projectPath, fullInstruction];
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

  async connect(): Promise<void> {
    await super.connect();
    logger.debug(`   Model: configured in ~/.codex/config.toml`);
    logger.debug(`   Mode: OpenAI API`);
  }
}
