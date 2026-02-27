export interface Message {
  from: string;
  text: string;
  timestamp: Date;
}

export interface MCPServerEntry {
  id: string;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  enabled: boolean;
}

export interface Config {
  aiProvider: string;
  aiModel?: string;
  platform: string;
  ideType: string;
  idePort: number;
  authorizedUser: string;
  configuredAt: string;
  projectPath?: string;
  ollamaModel?: string;
  claudeModel?: string;
  geminiModel?: string;
  updatedAt?: string;
  providers?: {
    [key: string]: {
      model: string;
    };
  };
  adapterModels?: {
    [adapterName: string]: string;
  };
  mcpServers?: MCPServerEntry[];
}

export interface ModelInfo {
  id: string;
  name: string;
}

export interface TrackedFiles {
  modified: string[];
  read: string[];
}

export interface IDEAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeCommand(
    instruction: string,
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
    signal?: AbortSignal,
    onProgress?: (chunk: string) => void,
  ): Promise<string>;
  getStatus(): Promise<string>;
  isHealthy(): Promise<boolean>;
  abort?(): void;
  getAvailableModels(): ModelInfo[];
  getCurrentModel(): string;
  setModel(modelId: string): void;
  getTrackedFiles(): TrackedFiles;
}

export interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  adapter: string;
}

export interface ContextSession {
  id: string;
  timestamp: string;
  adapter: string;
  task: string;
  approaches: string[];
  decisions: string[];
  currentState: string;
  conversationHistory: ConversationEntry[];
  trackedFiles?: TrackedFiles;
}
