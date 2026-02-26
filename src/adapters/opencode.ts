import { randomUUID } from "crypto";
import path from "path";
import { logger } from "../shared/logger";
import { ModelInfo } from "../shared/types";
import { AdapterConfig, BaseAdapter } from "./base-adapter";

const OPENCODE_MODELS: ModelInfo[] = [
  { id: "anthropic/claude-sonnet-4-5", name: "Claude Sonnet 4.5 (Anthropic)" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4 (Anthropic)" },
  { id: "openai/gpt-5.2", name: "GPT-5.2 (OpenAI)" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro (Google)" },
  { id: "copilot/gpt-5.2", name: "GPT-5.2 (Copilot)" },
];

export class OpenCodeAdapter extends BaseAdapter {
  private openCodeModel: string = "";
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
        "  brew install opencode-ai/tap/opencode\n" +
        "On Windows (PowerShell):\n" +
        "  irm https://raw.githubusercontent.com/opencode-ai/opencode/refs/heads/main/install.ps1 | iex\n" +
        "Or using Scoop:\n" +
        "  scoop install opencode",
      statusKeywords: ["opencode", "tokens", "completed", "success"],
      stdinMode: "inherit",
    };
  }

  protected buildArgs(fullInstruction: string): string[] {
    if (!this.sessionId) {
      this.sessionId = randomUUID();
    }

    const args = ["--non-interactive", "--session", this.sessionId];
    if (this.openCodeModel) {
      args.push("--model", this.openCodeModel);
    }
    args.push("--message", fullInstruction);
    return args;
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

  getAvailableModels(): ModelInfo[] {
    return OPENCODE_MODELS;
  }

  getCurrentModel(): string {
    return this.openCodeModel || "default";
  }

  setModel(modelId: string): void {
    this.openCodeModel = modelId;
    logger.debug(`OpenCode model set to: ${modelId}`);
  }

  async connect(): Promise<void> {
    await super.connect();
    logger.debug(`   Model: ${this.openCodeModel || "configured in opencode"}`);
    logger.debug(`   Mode: Terminal-based AI assistant`);
  }
}
