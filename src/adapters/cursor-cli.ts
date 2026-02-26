import { randomUUID } from "crypto";
import path from "path";
import { logger } from "../shared/logger";
import { AdapterConfig, BaseAdapter } from "./base-adapter";

export class CursorAdapter extends BaseAdapter {
  private currentSessionId: string | null = null;

  protected getConfig(): AdapterConfig {
    return {
      cliCommand: "cursor",
      displayName: "Cursor CLI",
      installUrl: "https://cursor.sh",
      installInstructions:
        "Please install Cursor IDE first.\nAfter installation, ensure 'cursor' command is in PATH.",
      statusKeywords: ["cursor"],
      stdinMode: "inherit",
    };
  }

  protected buildArgs(fullInstruction: string): string[] {
    const args: string[] = ["--headless"];

    if (this.currentSessionId) {
      args.push("--session-id", this.currentSessionId);
    } else {
      this.currentSessionId = randomUUID();
      args.push("--session-id", this.currentSessionId);
    }

    args.push("--prompt", fullInstruction);

    return args;
  }

  protected getStatusText(): string {
    return `Cursor CLI (Headless)
    
Project: ${path.basename(this.projectPath)}
Mode: Headless
Backend: Cursor AI
Cost: Cursor subscription
Privacy: Cloud-based
Session: ${this.currentSessionId || "None"}`;
  }

  async connect(): Promise<void> {
    await super.connect();
    logger.debug(`   Mode: Headless`);
  }
}
