import { randomUUID } from "crypto";
import path from "path";
import { logger } from "../shared/logger";
import { ModelInfo } from "../shared/types";
import { AdapterConfig, BaseAdapter } from "./base-adapter";

const CURSOR_MODELS: ModelInfo[] = [
  { id: "Auto", name: "Auto (default)" },
  { id: "Composer 1.5", name: "Composer 1.5" },
  { id: "Composer 1", name: "Composer 1" },
  { id: "GPT-5.3 Codex", name: "GPT-5.3 Codex" },
  { id: "GPT-5.3 Codex Fast", name: "GPT-5.3 Codex Fast" },
  { id: "GPT-5.3 Codex High", name: "GPT-5.3 Codex High" },
  { id: "GPT-5.3 Codex High Fast", name: "GPT-5.3 Codex High Fast" },
  { id: "GPT-5.3 Codex Low", name: "GPT-5.3 Codex Low" },
  { id: "GPT-5.3 Codex Low Fast", name: "GPT-5.3 Codex Low Fast" },
];

export class CursorAdapter extends BaseAdapter {
  private cursorModel: string = "Auto";
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

    if (this.cursorModel !== "Auto") {
      args.push("--model", this.cursorModel);
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

  getAvailableModels(): ModelInfo[] {
    return CURSOR_MODELS;
  }

  getCurrentModel(): string {
    return this.cursorModel;
  }

  setModel(modelId: string): void {
    this.cursorModel = modelId;
    logger.debug(`Cursor model set to: ${modelId}`);
  }

  async connect(): Promise<void> {
    await super.connect();
    logger.debug(`   Model: ${this.cursorModel}`);
    logger.debug(`   Mode: Headless`);
  }
}
