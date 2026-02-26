import { randomUUID } from "crypto";
import path from "path";
import { logger } from "../shared/logger";
import { AdapterConfig, BaseAdapter } from "./base-adapter";

export class OpenCodeAdapter extends BaseAdapter {
  private sessionId: string | null = null;

  protected getConfig(): AdapterConfig {
    return {
      cliCommand: "opencode",
      displayName: "OpenCode",
      installUrl: "https://github.com/opencode-ai/opencode",
      installInstructions:
        "Please install OpenCode CLI first:\n" +
        "  curl -fsSL https://raw.githubusercontent.com/opencode-ai/opencode/refs/heads/main/install | bash\n" +
        "Or using Homebrew:\n" +
        "  brew install opencode-ai/tap/opencode",
      statusKeywords: ["opencode", "tokens", "completed", "success"],
      stdinMode: "inherit",
    };
  }

  protected buildArgs(fullInstruction: string): string[] {
    if (!this.sessionId) {
      this.sessionId = randomUUID();
    }

    return ["--non-interactive", "--session", this.sessionId, "--message", fullInstruction];
  }

  protected getStatusText(): string {
    return `OpenCode (Terminal AI Assistant)
    
Project: ${path.basename(this.projectPath)}
Backend: Configured AI provider (OpenAI, Anthropic, Gemini, etc.)
Session: ${this.sessionId || "None"}

Features:
- Multiple AI provider support
- Session management
- Tool integration
- File change tracking`;
  }

  async connect(): Promise<void> {
    await super.connect();
    logger.debug(`   Mode: Terminal-based AI assistant`);
  }
}
