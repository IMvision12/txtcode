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
