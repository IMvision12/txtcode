import path from "path";
import { logger } from "../shared/logger";
import { AdapterConfig, BaseAdapter } from "./base-adapter";

export class KiroAdapter extends BaseAdapter {
  protected getConfig(): AdapterConfig {
    return {
      cliCommand: "kiro-cli",
      displayName: "Kiro CLI",
      installUrl: "https://kiro.dev/cli/",
      installInstructions:
        "Install it with:\n  curl -fsSL https://cli.kiro.dev/install | bash",
      statusKeywords: ["kiro"],
      stdinMode: "pipe",
    };
  }

  protected buildArgs(fullInstruction: string): string[] {
    return ["chat", "--no-interactive", fullInstruction];
  }

  protected exitCodeIndicatesSuccess(code: number | null, output: string): boolean {
    return code === 0 || output.length > 0;
  }

  protected getStatusText(): string {
    return `Kiro CLI

Project: ${path.basename(this.projectPath)}
Backend: AWS (Claude models)
Cost: Kiro subscription / credits
Privacy: Cloud-based
Session: Stateless (per-invocation)`;
  }

  async connect(): Promise<void> {
    await super.connect();
    logger.debug(`   Mode: non-interactive`);
  }
}
