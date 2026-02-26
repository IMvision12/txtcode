import path from "path";
import { logger } from "../shared/logger";
import { ModelInfo } from "../shared/types";
import { AdapterConfig, BaseAdapter } from "./base-adapter";

const GEMINI_MODELS: ModelInfo[] = [
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
];

export class GeminiCodeAdapter extends BaseAdapter {
  private geminiModel: string;
  private sessionStarted: boolean = false;

  constructor() {
    super();
    this.geminiModel = process.env.GEMINI_MODEL || "";
  }

  protected getConfig(): AdapterConfig {
    return {
      cliCommand: "gemini",
      displayName: "Gemini Code",
      installUrl: "https://github.com/google/generative-ai-cli",
      installInstructions: "Please install Gemini CLI first.",
      statusKeywords: ["gemini"],
      stdinMode: "pipe",
    };
  }

  protected buildArgs(fullInstruction: string): string[] {
    const args: string[] = [];
    args.push("--approval-mode", "yolo");

    if (this.geminiModel) {
      args.push("--model", this.geminiModel);
    }

    args.push("-p", fullInstruction);

    return args;
  }

  protected onProcessSpawned(): void {
    if (!this.sessionStarted) {
      this.sessionStarted = true;
    }
  }

  protected exitCodeIndicatesSuccess(code: number | null, output: string): boolean {
    return code === 0 || output.length > 0;
  }

  protected extraFormatResponse(formatted: string): string {
    formatted = formatted.replace(/YOLO mode is enabled.*?\n/g, "");
    formatted = formatted.replace(/Hook registry initialized.*?\n/g, "");
    formatted = formatted.replace(/Loaded cached credentials.*?\n/g, "");
    return formatted;
  }

  protected getStatusText(): string {
    const modelDisplay = this.geminiModel ? this.geminiModel : "default (Gemini CLI)";

    return `Gemini Code
    
Project: ${path.basename(this.projectPath)}
Model: ${modelDisplay}
Backend: Google AI API
Cost: Paid (API usage)
Privacy: Cloud-based
Session: ${this.sessionStarted ? "Active" : "None"}`;
  }

  getAvailableModels(): ModelInfo[] {
    return GEMINI_MODELS;
  }

  getCurrentModel(): string {
    return this.geminiModel || "default";
  }

  setModel(modelId: string): void {
    this.geminiModel = modelId;
    logger.debug(`Gemini model set to: ${modelId}`);
  }

  async connect(): Promise<void> {
    await super.connect();
    logger.debug(`   Model: ${this.geminiModel || "default (Gemini CLI)"}`);
    logger.debug(`   Mode: Google AI API`);
  }

  async disconnect(): Promise<void> {
    this.sessionStarted = false;
    await super.disconnect();
  }
}
