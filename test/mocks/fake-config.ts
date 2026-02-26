import type { Config } from "../../src/shared/types";

export function createFakeConfig(overrides: Partial<Config> = {}): Config {
  return {
    aiProvider: "anthropic",
    aiModel: "claude-sonnet-4",
    platform: "telegram",
    ideType: "claude-code",
    idePort: 3000,
    authorizedUser: "user123",
    configuredAt: "2026-01-01T00:00:00.000Z",
    providers: {
      anthropic: { model: "claude-sonnet-4" },
      openai: { model: "gpt-5.2" },
    },
    ...overrides,
  };
}

export function setupFakeFs(config: Config | null): {
  existsSync: (p: string) => boolean;
  readFileSync: (p: string) => string;
  writeFileSync: (p: string, data: string) => void;
  written: Map<string, string>;
} {
  const written = new Map<string, string>();

  return {
    existsSync: (_p: string) => config !== null,
    readFileSync: (_p: string) => {
      if (!config) throw new Error("ENOENT");
      return JSON.stringify(config);
    },
    writeFileSync: (p: string, data: string) => {
      written.set(p, data);
    },
    written,
  };
}
