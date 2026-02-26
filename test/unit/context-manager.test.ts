import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/shared/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("../../src/core/context-prompt", () => ({
  generateHandoffPrompt: vi.fn().mockReturnValue("handoff prompt text"),
  summarizeHistory: vi.fn().mockReturnValue({
    task: "test task",
    approaches: ["approach1"],
    decisions: ["decision1"],
    currentState: "in progress",
  }),
}));

vi.mock("../../src/core/context-store", () => ({
  saveSession: vi.fn(),
  loadLatestSession: vi.fn().mockReturnValue(null),
}));

import { ContextManager } from "../../src/core/context-manager";

describe("ContextManager", () => {
  let cm: ContextManager;

  beforeEach(() => {
    cm = new ContextManager();
    cm.setCurrentAdapter("claude-code");
  });

  it("starts with zero entries", () => {
    expect(cm.getEntryCount()).toBe(0);
    expect(cm.getHistory()).toEqual([]);
  });

  it("addEntry tracks messages", () => {
    cm.addEntry("user", "hello");
    cm.addEntry("assistant", "hi back");

    expect(cm.getEntryCount()).toBe(2);
    const history = cm.getHistory();
    expect(history[0].role).toBe("user");
    expect(history[0].content).toBe("hello");
    expect(history[0].adapter).toBe("claude-code");
    expect(history[1].role).toBe("assistant");
  });

  it("caps history at maxEntries (50)", () => {
    for (let i = 0; i < 60; i++) {
      cm.addEntry("user", `message ${i}`);
    }
    expect(cm.getEntryCount()).toBe(50);
  });

  it("getHistory returns a copy", () => {
    cm.addEntry("user", "test");
    const h1 = cm.getHistory();
    const h2 = cm.getHistory();
    expect(h1).not.toBe(h2);
    expect(h1).toEqual(h2);
  });

  it("clear resets history", () => {
    cm.addEntry("user", "test");
    cm.clear();
    expect(cm.getEntryCount()).toBe(0);
  });

  it("handleSwitch returns null when no history", () => {
    const result = cm.handleSwitch("claude-code", "gemini-code");
    expect(result).toBeNull();
  });

  it("handleSwitch returns handoff prompt when history exists", () => {
    cm.addEntry("user", "do something");
    cm.addEntry("assistant", "done");
    const result = cm.handleSwitch("claude-code", "gemini-code");
    expect(result).toBe("handoff prompt text");
  });

  it("handleSwitch resets history and updates adapter", () => {
    cm.addEntry("user", "task");
    cm.handleSwitch("claude-code", "gemini-code");
    expect(cm.getEntryCount()).toBe(0);
  });
});
