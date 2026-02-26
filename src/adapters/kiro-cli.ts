import path from "path";
import { logger } from "../shared/logger";
import { ModelInfo } from "../shared/types";
import { AdapterConfig, BaseAdapter } from "./base-adapter";

const KIRO_MODELS: ModelInfo[] = [
  { id: "auto", name: "Auto (default)" },
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
  { id: "claude-sonnet-4", name: "Claude Sonnet 4" },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
  { id: "deepseek-3.2", name: "DeepSeek V3.2" },
  { id: "minimax-m2.1", name: "MiniMax M2.1" },
  { id: "qwen3-coder-next", name: "Qwen3 Coder Next" },
];

export class KiroAdapter extends BaseAdapter {
  private kiroModel: string = "auto";
  protected getConfig(): AdapterConfig {
    return {
      cliCommand: "kiro-cli",
      displayName: "Kiro CLI",
      installUrl: "https://kiro.dev/cli/",
      installInstructions: "Install it with:\n  curl -fsSL https://cli.kiro.dev/install | bash",
      statusKeywords: ["kiro"],
      stdinMode: "pipe",
    };
  }

  protected buildArgs(fullInstruction: string): string[] {
    const args = ["chat", "--no-interactive"];
    if (this.kiroModel !== "auto") {
      args.push("--model", this.kiroModel);
    }
    args.push(fullInstruction);
    return args;
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

  getAvailableModels(): ModelInfo[] {
    return KIRO_MODELS;
  }

  getCurrentModel(): string {
    return this.kiroModel;
  }

  setModel(modelId: string): void {
    this.kiroModel = modelId;
    logger.debug(`Kiro model set to: ${modelId}`);
  }

  async connect(): Promise<void> {
    await super.connect();
    logger.debug(`   Model: ${this.kiroModel}`);
    logger.debug(`   Mode: non-interactive`);
  }
}
