import { IDEAdapter, ModelInfo } from "../../src/shared/types";

export class FakeAdapter implements IDEAdapter {
  connected = false;
  lastInstruction = "";
  aborted = false;
  modelId = "fake-model";
  executeResult = "Fake result";

  private models: ModelInfo[] = [
    { id: "model-a", name: "Model A" },
    { id: "model-b", name: "Model B" },
    { id: "model-c", name: "Model C" },
  ];

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async executeCommand(
    instruction: string,
    _conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
    signal?: AbortSignal,
    onProgress?: (chunk: string) => void,
  ): Promise<string> {
    this.lastInstruction = instruction;

    if (signal?.aborted) {
      throw new Error("Command execution aborted");
    }

    if (onProgress) {
      onProgress("progress...");
    }

    return this.executeResult;
  }

  async getStatus(): Promise<string> {
    return this.connected ? "Connected" : "Not connected";
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  abort(): void {
    this.aborted = true;
  }

  getAvailableModels(): ModelInfo[] {
    return this.models;
  }

  getCurrentModel(): string {
    return this.modelId;
  }

  setModel(modelId: string): void {
    this.modelId = modelId;
  }
}
