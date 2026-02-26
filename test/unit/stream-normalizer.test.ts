import { describe, it, expect } from "vitest";
import { normalizeStreamOutput, isSilentReply } from "../../src/shared/stream-normalizer";

describe("normalizeStreamOutput", () => {
  it("returns skip for undefined input", () => {
    const result = normalizeStreamOutput(undefined);
    expect(result.skip).toBe(true);
    expect(result.text).toBe("");
  });

  it("returns skip for empty string", () => {
    const result = normalizeStreamOutput("");
    expect(result.skip).toBe(true);
  });

  it("returns skip for whitespace-only string", () => {
    const result = normalizeStreamOutput("   \n  \t  ");
    expect(result.skip).toBe(true);
  });

  it("strips ANSI escape codes", () => {
    const result = normalizeStreamOutput("\x1b[32mHello\x1b[0m World");
    expect(result.text).toBe("Hello World");
    expect(result.skip).toBe(false);
    expect(result.stripped?.ansi).toBe(true);
  });

  it("strips heartbeat tokens", () => {
    const result = normalizeStreamOutput("data HEARTBEAT_OK more");
    expect(result.text).toBe("data  more");
    expect(result.stripped?.heartbeat).toBe(true);
  });

  it("strips control characters but keeps newlines and tabs", () => {
    const result = normalizeStreamOutput("hello\x00\x01world");
    expect(result.text).toBe("helloworld");
    expect(result.stripped?.control).toBe(true);
  });

  it("preserves clean text as-is", () => {
    const result = normalizeStreamOutput("Clean text output");
    expect(result.text).toBe("Clean text output");
    expect(result.skip).toBe(false);
  });

  it("handles combined ANSI + heartbeat + control chars", () => {
    const result = normalizeStreamOutput("\x1b[31mHEARTBEAT_OK\x00test\x1b[0m");
    expect(result.text).toBe("test");
    expect(result.stripped?.ansi).toBe(true);
    expect(result.stripped?.heartbeat).toBe(true);
    expect(result.stripped?.control).toBe(true);
  });
});

describe("isSilentReply", () => {
  it("returns true for empty string", () => {
    expect(isSilentReply("")).toBe(true);
  });

  it("returns true for 'ok'", () => {
    expect(isSilentReply("ok")).toBe(true);
    expect(isSilentReply("  OK  ")).toBe(true);
  });

  it("returns true for 'done'", () => {
    expect(isSilentReply("done")).toBe(true);
  });

  it("returns true for [silent] prefix", () => {
    expect(isSilentReply("[silent] something")).toBe(true);
  });

  it("returns true for (no output) prefix", () => {
    expect(isSilentReply("(no output) something")).toBe(true);
  });

  it("returns false for normal text", () => {
    expect(isSilentReply("Here is a code change")).toBe(false);
  });
});
