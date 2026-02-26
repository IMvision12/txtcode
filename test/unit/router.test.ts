import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock logger
vi.mock("../../src/shared/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

// Mock child_process
vi.mock("child_process", () => ({
  spawn: vi.fn(),
  exec: vi.fn((_cmd: string, ...args: unknown[]) => {
    const cb = args[args.length - 1];
    if (typeof cb === "function") {
      cb(null, "1.0.0");
    }
  }),
  execSync: vi.fn(),
}));

// Mock context manager deps
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

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn(),
    createWriteStream: vi.fn().mockReturnValue({ write: vi.fn(), on: vi.fn() }),
  },
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([]),
  statSync: vi.fn(),
  createWriteStream: vi.fn().mockReturnValue({ write: vi.fn(), on: vi.fn() }),
}));

describe("Router", () => {
  let Router: typeof import("../../src/core/router").Router;
  let AVAILABLE_ADAPTERS: typeof import("../../src/core/router").AVAILABLE_ADAPTERS;
  let router: InstanceType<typeof import("../../src/core/router").Router>;

  beforeEach(async () => {
    process.env.IDE_TYPE = "claude-code";
    process.env.AI_PROVIDER = "anthropic";
    process.env.AI_API_KEY = "test-key";
    process.env.AI_MODEL = "claude-sonnet-4";

    vi.resetModules();

    vi.doMock("fs", () => ({
      default: {
        existsSync: vi.fn().mockReturnValue(false),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
        mkdirSync: vi.fn(),
        readdirSync: vi.fn().mockReturnValue([]),
        statSync: vi.fn(),
        createWriteStream: vi.fn().mockReturnValue({ write: vi.fn(), on: vi.fn() }),
      },
      existsSync: vi.fn().mockReturnValue(false),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
      readdirSync: vi.fn().mockReturnValue([]),
      statSync: vi.fn(),
      createWriteStream: vi.fn().mockReturnValue({ write: vi.fn(), on: vi.fn() }),
    }));

    const mod = await import("../../src/core/router");
    Router = mod.Router;
    AVAILABLE_ADAPTERS = mod.AVAILABLE_ADAPTERS;
    router = new Router();
  });

  describe("initialization", () => {
    it("reads env vars for provider config", () => {
      expect(router.getProviderName()).toBe("anthropic");
      expect(router.getCurrentModel()).toBe("claude-sonnet-4");
      expect(router.getAdapterName()).toBe("claude-code");
    });

    it("throws for unknown IDE_TYPE", async () => {
      process.env.IDE_TYPE = "unknown-adapter";
      vi.resetModules();
      vi.doMock("fs", () => ({
        default: {
          existsSync: vi.fn().mockReturnValue(false),
          readFileSync: vi.fn(),
          writeFileSync: vi.fn(),
          mkdirSync: vi.fn(),
          readdirSync: vi.fn().mockReturnValue([]),
          statSync: vi.fn(),
          createWriteStream: vi.fn().mockReturnValue({ write: vi.fn(), on: vi.fn() }),
        },
        existsSync: vi.fn().mockReturnValue(false),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
        mkdirSync: vi.fn(),
        readdirSync: vi.fn().mockReturnValue([]),
        statSync: vi.fn(),
        createWriteStream: vi.fn().mockReturnValue({ write: vi.fn(), on: vi.fn() }),
      }));
      const mod2 = await import("../../src/core/router");
      expect(() => new mod2.Router()).toThrow("No coding adapter configured");
    });
  });

  describe("AVAILABLE_ADAPTERS", () => {
    it("has expected adapter entries", () => {
      const ids = AVAILABLE_ADAPTERS.map((a: { id: string }) => a.id);
      expect(ids).toContain("claude-code");
      expect(ids).toContain("cursor");
      expect(ids).toContain("gemini-code");
      expect(ids).toContain("codex");
      expect(ids).toContain("kiro");
    });
  });

  describe("adapter model methods", () => {
    it("getAdapterModels returns models from the adapter", () => {
      const models = router.getAdapterModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it("getAdapterCurrentModel returns current model", () => {
      const model = router.getAdapterCurrentModel();
      expect(typeof model).toBe("string");
    });

    it("setAdapterModel changes the adapter model", () => {
      router.setAdapterModel("opus");
      expect(router.getAdapterCurrentModel()).toBe("opus");
    });
  });

  describe("updateProvider", () => {
    it("updates provider, API key, and model", () => {
      router.updateProvider("openai", "new-key", "gpt-5.2");
      expect(router.getProviderName()).toBe("openai");
      expect(router.getCurrentModel()).toBe("gpt-5.2");
      expect(process.env.AI_PROVIDER).toBe("openai");
    });
  });

  describe("routeToChat", () => {
    it("returns warning when no API key", async () => {
      router.updateProvider("anthropic", "", "claude-sonnet-4");
      const result = await router.routeToChat("hello");
      expect(result).toContain("[WARN]");
      expect(result).toContain("API key");
    });

    it("returns warning when no model", async () => {
      router.updateProvider("anthropic", "key", "");
      const result = await router.routeToChat("hello");
      expect(result).toContain("[WARN]");
      expect(result).toContain("model");
    });

    it("returns error for unsupported provider", async () => {
      router.updateProvider("fakeprovider", "key", "model");
      const result = await router.routeToChat("hello");
      expect(result).toContain("[ERROR]");
      expect(result).toContain("Unsupported");
    });
  });

  describe("abortCurrentCommand", () => {
    it("does not throw when no command is running", () => {
      expect(() => router.abortCurrentCommand()).not.toThrow();
    });
  });

  describe("switchAdapter", () => {
    it("switches to a different adapter", async () => {
      const result = await router.switchAdapter("gemini-code");
      expect(result.oldAdapter).toBe("claude-code");
      expect(router.getAdapterName()).toBe("gemini-code");
    });

    it("returns handoff info", async () => {
      const result = await router.switchAdapter("codex");
      expect(typeof result.handoffGenerated).toBe("boolean");
      expect(typeof result.entryCount).toBe("number");
    });
  });
});
