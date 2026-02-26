import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AdapterConfig } from "../../src/adapters/base-adapter";
import { ClaudeCodeAdapter } from "../../src/adapters/claude-code";
import { CursorAdapter } from "../../src/adapters/cursor-cli";
import { GeminiCodeAdapter } from "../../src/adapters/gemini-cli";
import { KiroAdapter } from "../../src/adapters/kiro-cli";
import { CodexAdapter } from "../../src/adapters/openai-codex";
import { OpenCodeAdapter } from "../../src/adapters/opencode";

interface AdapterInternals {
  buildArgs(instruction: string): string[];
  getConfig(): AdapterConfig;
}

// Suppress logger file I/O during tests
vi.mock("../../src/shared/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ClaudeCodeAdapter", () => {
  let adapter: ClaudeCodeAdapter;

  beforeEach(() => {
    delete process.env.CLAUDE_MODEL;
    adapter = new ClaudeCodeAdapter();
  });

  it("returns correct available models", () => {
    const models = adapter.getAvailableModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.map((m) => m.id)).toContain("sonnet");
    expect(models.map((m) => m.id)).toContain("claude-sonnet-4-5");
  });

  it("defaults to sonnet model", () => {
    expect(adapter.getCurrentModel()).toBe("sonnet");
  });

  it("uses CLAUDE_MODEL env var when set", () => {
    process.env.CLAUDE_MODEL = "opus";
    const a = new ClaudeCodeAdapter();
    expect(a.getCurrentModel()).toBe("opus");
  });

  it("setModel changes current model", () => {
    adapter.setModel("claude-haiku-4-5");
    expect(adapter.getCurrentModel()).toBe("claude-haiku-4-5");
  });

  it("buildArgs includes --model flag", () => {
    const args = (adapter as unknown as AdapterInternals).buildArgs("fix the bug");
    expect(args).toContain("--model");
    expect(args).toContain("sonnet");
    expect(args).toContain("fix the bug");
    expect(args).toContain("--permission-mode");
  });

  it("buildArgs uses updated model after setModel", () => {
    adapter.setModel("opus");
    const args = (adapter as unknown as AdapterInternals).buildArgs("do something");
    expect(args).toContain("opus");
  });

  it("getConfig returns correct CLI command", () => {
    const config = (adapter as unknown as AdapterInternals).getConfig();
    expect(config.cliCommand).toBe("claude");
    expect(config.displayName).toContain("Claude Code");
  });
});

describe("CursorAdapter", () => {
  let adapter: CursorAdapter;

  beforeEach(() => {
    adapter = new CursorAdapter();
  });

  it("returns available models", () => {
    const models = adapter.getAvailableModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.map((m) => m.id)).toContain("Auto");
  });

  it("defaults to Auto model", () => {
    expect(adapter.getCurrentModel()).toBe("Auto");
  });

  it("buildArgs omits --model when Auto", () => {
    const args = (adapter as unknown as AdapterInternals).buildArgs("write tests");
    expect(args).not.toContain("--model");
    expect(args).toContain("--headless");
    expect(args).toContain("--prompt");
  });

  it("buildArgs includes --model when non-Auto", () => {
    adapter.setModel("GPT-5.3 Codex");
    const args = (adapter as unknown as AdapterInternals).buildArgs("refactor");
    expect(args).toContain("--model");
    expect(args).toContain("GPT-5.3 Codex");
  });

  it("getConfig returns cursor CLI command", () => {
    const config = (adapter as unknown as AdapterInternals).getConfig();
    expect(config.cliCommand).toBe("cursor");
  });
});

describe("GeminiCodeAdapter", () => {
  let adapter: GeminiCodeAdapter;

  beforeEach(() => {
    delete process.env.GEMINI_MODEL;
    adapter = new GeminiCodeAdapter();
  });

  it("returns available models", () => {
    const models = adapter.getAvailableModels();
    expect(models.map((m) => m.id)).toContain("gemini-2.5-pro");
  });

  it("defaults to 'default' when no env var", () => {
    expect(adapter.getCurrentModel()).toBe("default");
  });

  it("uses GEMINI_MODEL env var when set", () => {
    process.env.GEMINI_MODEL = "gemini-2.5-flash";
    const a = new GeminiCodeAdapter();
    expect(a.getCurrentModel()).toBe("gemini-2.5-flash");
  });

  it("buildArgs omits --model when model is empty", () => {
    const args = (adapter as unknown as AdapterInternals).buildArgs("explain code");
    expect(args).not.toContain("--model");
    expect(args).toContain("--approval-mode");
    expect(args).toContain("yolo");
    expect(args).toContain("-p");
  });

  it("buildArgs includes --model when model is set", () => {
    adapter.setModel("gemini-2.5-pro");
    const args = (adapter as unknown as AdapterInternals).buildArgs("explain code");
    expect(args).toContain("--model");
    expect(args).toContain("gemini-2.5-pro");
  });
});

describe("KiroAdapter", () => {
  let adapter: KiroAdapter;

  beforeEach(() => {
    adapter = new KiroAdapter();
  });

  it("returns available models", () => {
    const models = adapter.getAvailableModels();
    expect(models.map((m) => m.id)).toContain("auto");
    expect(models.map((m) => m.id)).toContain("claude-sonnet-4-5");
  });

  it("defaults to auto model", () => {
    expect(adapter.getCurrentModel()).toBe("auto");
  });

  it("buildArgs omits --model when auto", () => {
    const args = (adapter as unknown as AdapterInternals).buildArgs("build feature");
    expect(args).toContain("chat");
    expect(args).toContain("--no-interactive");
    expect(args).not.toContain("--model");
    expect(args).toContain("build feature");
  });

  it("buildArgs includes --model when non-auto", () => {
    adapter.setModel("claude-sonnet-4");
    const args = (adapter as unknown as AdapterInternals).buildArgs("build feature");
    expect(args).toContain("--model");
    expect(args).toContain("claude-sonnet-4");
  });
});

describe("CodexAdapter", () => {
  let adapter: CodexAdapter;

  beforeEach(() => {
    adapter = new CodexAdapter();
  });

  it("returns available models", () => {
    const models = adapter.getAvailableModels();
    expect(models.map((m) => m.id)).toContain("gpt-5.3-codex");
    expect(models.map((m) => m.id)).toContain("gpt-5.1-codex-mini");
  });

  it("defaults to gpt-5.3-codex", () => {
    expect(adapter.getCurrentModel()).toBe("gpt-5.3-codex");
  });

  it("buildArgs includes -m flag with model", () => {
    const args = (adapter as unknown as AdapterInternals).buildArgs("create api");
    expect(args).toContain("exec");
    expect(args).toContain("--full-auto");
    expect(args).toContain("-m");
    expect(args).toContain("gpt-5.3-codex");
  });

  it("buildArgs reflects model change", () => {
    adapter.setModel("gpt-5.2-codex");
    const args = (adapter as unknown as AdapterInternals).buildArgs("refactor");
    expect(args).toContain("gpt-5.2-codex");
  });
});

describe("OpenCodeAdapter", () => {
  let adapter: OpenCodeAdapter;

  beforeEach(() => {
    adapter = new OpenCodeAdapter();
  });

  it("returns available models", () => {
    const models = adapter.getAvailableModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.map((m) => m.id)).toContain("anthropic/claude-sonnet-4-5");
  });

  it("defaults to 'default' model", () => {
    expect(adapter.getCurrentModel()).toBe("default");
  });

  it("buildArgs omits --model when default (empty)", () => {
    const args = (adapter as unknown as AdapterInternals).buildArgs("test");
    expect(args).toContain("--non-interactive");
    expect(args).toContain("--message");
    expect(args).not.toContain("--model");
  });

  it("buildArgs includes --model after setModel", () => {
    adapter.setModel("openai/gpt-5.2");
    const args = (adapter as unknown as AdapterInternals).buildArgs("test");
    expect(args).toContain("--model");
    expect(args).toContain("openai/gpt-5.2");
  });
});
