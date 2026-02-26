import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Message } from "../../src/shared/types";

vi.mock("fs", () => {
  const fn = vi.fn;
  const configStr = JSON.stringify({
    authorizedUser: "user1",
    aiProvider: "anthropic",
    aiModel: "claude-sonnet-4",
    ideType: "claude-code",
    providers: {
      anthropic: { model: "claude-sonnet-4" },
      openai: { model: "gpt-5.2" },
    },
  });
  return {
    default: {
      existsSync: fn().mockReturnValue(true),
      readFileSync: fn().mockReturnValue(configStr),
      writeFileSync: fn(),
      mkdirSync: fn(),
      readdirSync: fn().mockReturnValue([]),
      statSync: fn(),
      createWriteStream: fn().mockReturnValue({ write: fn(), on: fn() }),
    },
    existsSync: fn().mockReturnValue(true),
    readFileSync: fn().mockReturnValue(configStr),
    writeFileSync: fn(),
    mkdirSync: fn(),
    readdirSync: fn().mockReturnValue([]),
    statSync: fn(),
    createWriteStream: fn().mockReturnValue({ write: fn(), on: fn() }),
  };
});

vi.mock("../../src/shared/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("../../src/utils/keychain", () => ({
  getApiKey: vi.fn().mockResolvedValue("fake-key"),
}));

vi.mock("child_process", () => ({
  spawn: vi.fn(),
  exec: vi.fn((_cmd: string, ...args: unknown[]) => {
    const cb = args[args.length - 1];
    if (typeof cb === "function") {cb(null, "1.0.0");}
  }),
  execSync: vi.fn(),
}));

vi.mock("../../src/core/context-prompt", () => ({
  generateHandoffPrompt: vi.fn().mockReturnValue("handoff"),
  summarizeHistory: vi.fn().mockReturnValue({
    task: "",
    approaches: [],
    decisions: [],
    currentState: "",
  }),
}));

vi.mock("../../src/core/context-store", () => ({
  saveSession: vi.fn(),
  loadLatestSession: vi.fn().mockReturnValue(null),
}));

vi.mock("../../src/tools/terminal", () => ({
  TerminalTool: class {
    name = "terminal";
    execute() {}
  },
}));

vi.mock("../../src/tools/process", () => ({
  ProcessTool: class {
    name = "process";
    execute() {}
  },
}));

vi.mock("../../src/tools/registry", () => ({
  ToolRegistry: class {
    register() {}
  },
}));

import { AgentCore } from "../../src/core/agent";

function msg(text: string, from = "user1"): Message {
  return { from, text, timestamp: new Date() };
}

describe("AgentCore commands", () => {
  let agent: AgentCore;

  beforeEach(() => {
    process.env.IDE_TYPE = "claude-code";
    process.env.AI_PROVIDER = "anthropic";
    process.env.AI_API_KEY = "test-key";
    process.env.AI_MODEL = "claude-sonnet-4";
    agent = new AgentCore();
    // Directly set authorized user since require("fs") inside AgentCore
    // may not resolve the vi.mock in all environments
    (agent as unknown as { authorizedUser: string }).authorizedUser = "user1";
  });

  describe("/code command", () => {
    it("switches to code mode", async () => {
      const result = await agent.processMessage(msg("/code"));
      expect(result).toContain("[CODE MODE]");
      expect(result).toContain("coding adapter");
    });

    it("is case-insensitive", async () => {
      const result = await agent.processMessage(msg("/CODE"));
      expect(result).toContain("[CODE MODE]");
    });
  });

  describe("/chat command", () => {
    it("switches to chat mode", async () => {
      const result = await agent.processMessage(msg("/chat"));
      expect(result).toContain("[CHAT MODE]");
      expect(result).toContain("primary LLM");
    });
  });

  describe("/cancel command", () => {
    it("returns cancellation message", async () => {
      const result = await agent.processMessage(msg("/cancel"));
      expect(result).toContain("cancelled");
    });
  });

  describe("/help command", () => {
    it("returns help message with all commands", async () => {
      const result = await agent.processMessage(msg("/help"));
      expect(result).toContain("/code");
      expect(result).toContain("/chat");
      expect(result).toContain("/cancel");
      expect(result).toContain("/switch");
      expect(result).toContain("/cli-model");
      expect(result).toContain("/status");
      expect(result).toContain("/help");
    });

    it("also works with 'help' (no slash)", async () => {
      const result = await agent.processMessage(msg("help"));
      expect(result).toContain("/code");
    });
  });

  describe("/switch command", () => {
    it("shows main switch menu with 2 options", async () => {
      const result = await agent.processMessage(msg("/switch"));
      expect(result).toContain("Primary LLM");
      expect(result).toContain("Coding Adaptor");
      expect(result).toContain("1.");
      expect(result).toContain("2.");
    });

    it("entering 2 shows adapter list", async () => {
      await agent.processMessage(msg("/switch"));
      const result = await agent.processMessage(msg("2"));
      expect(result).toContain("Switch Coding Adapter");
      expect(result).toContain("Claude Code");
    });

    it("invalid input clears pending state", async () => {
      await agent.processMessage(msg("/switch"));
      const result = await agent.processMessage(msg("999"));
      expect(result).toContain("Invalid selection");
    });
  });

  describe("/cli-model command", () => {
    it("shows model list for current adapter", async () => {
      const result = await agent.processMessage(msg("/cli-model"));
      expect(result).toContain("CLI Model Selection");
      expect(result).toContain("Current model:");
      expect(result).toContain("0. Enter custom model name");
    });

    it("selecting a number switches model", async () => {
      await agent.processMessage(msg("/cli-model"));
      const result = await agent.processMessage(msg("2"));
      expect(result).toContain("Model switched");
    });

    it("selecting 0 asks for custom model name", async () => {
      await agent.processMessage(msg("/cli-model"));
      const result = await agent.processMessage(msg("0"));
      expect(result).toContain("Enter the model name");
    });

    it("custom model name is applied", async () => {
      await agent.processMessage(msg("/cli-model"));
      await agent.processMessage(msg("0"));
      const result = await agent.processMessage(msg("my-custom-model"));
      expect(result).toContain("Model switched");
      expect(result).toContain("my-custom-model");
      expect(result).toContain("custom");
    });

    it("empty custom model name is rejected", async () => {
      await agent.processMessage(msg("/cli-model"));
      await agent.processMessage(msg("0"));
      const result = await agent.processMessage(msg("  "));
      expect(result).toContain("No model name provided");
    });
  });

  describe("shouldStream", () => {
    it("returns false for command messages", () => {
      expect(agent.shouldStream("user1", "/code")).toBe(false);
      expect(agent.shouldStream("user1", "/chat")).toBe(false);
      expect(agent.shouldStream("user1", "/switch")).toBe(false);
      expect(agent.shouldStream("user1", "/cancel")).toBe(false);
      expect(agent.shouldStream("user1", "/cli-model")).toBe(false);
      expect(agent.shouldStream("user1", "/help")).toBe(false);
      expect(agent.shouldStream("user1", "help")).toBe(false);
      expect(agent.shouldStream("user1", "/status")).toBe(false);
      expect(agent.shouldStream("user1", "status")).toBe(false);
    });

    it("returns false when not in code mode", () => {
      expect(agent.shouldStream("user1", "build a feature")).toBe(false);
    });

    it("returns true in code mode for non-command text", async () => {
      await agent.processMessage(msg("/code"));
      expect(agent.shouldStream("user1", "build a feature")).toBe(true);
    });

    it("returns false when pending switch", async () => {
      await agent.processMessage(msg("/code"));
      await agent.processMessage(msg("/switch"));
      expect(agent.shouldStream("user1", "1")).toBe(false);
    });
  });

  describe("authorization", () => {
    it("allows the configured authorized user", async () => {
      const result = await agent.processMessage(msg("/help", "user1"));
      expect(result).not.toContain("[UNAUTHORIZED]");
    });

    it("rejects unauthorized users", async () => {
      const result = await agent.processMessage(msg("/help", "hacker99"));
      expect(result).toBe("[UNAUTHORIZED]");
    });
  });
});
