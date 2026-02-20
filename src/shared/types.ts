export interface Message {
  from: string;
  text: string;
  timestamp: Date;
}

export interface Config {
  aiProvider: string;
  aiApiKey: string;
  aiModel?: string;
  platform: string;
  telegramToken?: string;
  discordToken?: string;
  authorizedUserId?: string;
  ideType: string;
  idePort: number;
  authorizedUser: string;
  configuredAt: string;
  projectPath?: string;
  ollamaModel?: string;
  claudeModel?: string;
  geminiModel?: string;
  updatedAt?: string;
}

export interface IDEAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeCommand(instruction: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string>;
  getStatus(): Promise<string>;
  isHealthy(): Promise<boolean>;
}
