import { describe, it, expect } from "vitest";
import {
  stripAnsi,
  collapseWhitespace,
  isDiffLine,
  isCliNoiseLine,
  detectRateLimit,
} from "../../src/adapters/base-adapter";

describe("stripAnsi", () => {
  it("removes color codes", () => {
    expect(stripAnsi("\x1b[32mgreen\x1b[0m")).toBe("green");
  });

  it("removes cursor movement codes", () => {
    expect(stripAnsi("\x1b[2Jcleared\x1b[H")).toBe("cleared");
  });

  it("leaves clean text unchanged", () => {
    expect(stripAnsi("clean text")).toBe("clean text");
  });

  it("handles multiple ANSI codes in sequence", () => {
    expect(stripAnsi("\x1b[1m\x1b[31mbold red\x1b[0m")).toBe("bold red");
  });

  it("handles empty string", () => {
    expect(stripAnsi("")).toBe("");
  });
});

describe("collapseWhitespace", () => {
  it("collapses triple+ newlines to double", () => {
    expect(collapseWhitespace("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("trims leading/trailing whitespace", () => {
    expect(collapseWhitespace("  hello  ")).toBe("hello");
  });

  it("preserves double newlines", () => {
    expect(collapseWhitespace("a\n\nb")).toBe("a\n\nb");
  });

  it("handles empty string", () => {
    expect(collapseWhitespace("")).toBe("");
  });
});

describe("isDiffLine", () => {
  it("detects + lines", () => {
    expect(isDiffLine("+added line")).toBe(true);
  });

  it("detects - lines", () => {
    expect(isDiffLine("-removed line")).toBe(true);
  });

  it("detects @@ hunk headers", () => {
    expect(isDiffLine("@@ -1,5 +1,7 @@")).toBe(true);
  });

  it("detects diff header", () => {
    expect(isDiffLine("diff --git a/file b/file")).toBe(true);
  });

  it("detects index line", () => {
    expect(isDiffLine("index abc123..def456")).toBe(true);
  });

  it("detects --- and +++", () => {
    expect(isDiffLine("--- a/file")).toBe(true);
    expect(isDiffLine("+++ b/file")).toBe(true);
  });

  it("detects new file / deleted file", () => {
    expect(isDiffLine("new file mode 100644")).toBe(true);
    expect(isDiffLine("deleted file mode 100644")).toBe(true);
  });

  it("returns false for normal text", () => {
    expect(isDiffLine("This is normal text")).toBe(false);
    expect(isDiffLine("Hello world")).toBe(false);
  });
});

describe("isCliNoiseLine", () => {
  it("returns true for empty string", () => {
    expect(isCliNoiseLine("")).toBe(true);
  });

  it("detects box-drawing characters", () => {
    expect(isCliNoiseLine("╭────────────╮")).toBe(true);
    expect(isCliNoiseLine("╰────────────╯")).toBe(true);
    expect(isCliNoiseLine("│            │")).toBe(true);
  });

  it("detects horizontal rules", () => {
    expect(isCliNoiseLine("────────────")).toBe(true);
    expect(isCliNoiseLine("━━━━━━━━━━━━")).toBe(true);
  });

  it("detects loading/status messages", () => {
    expect(isCliNoiseLine("Loading...")).toBe(true);
    expect(isCliNoiseLine("Initializing environment")).toBe(true);
    expect(isCliNoiseLine("Connecting to server")).toBe(true);
    expect(isCliNoiseLine("Starting process")).toBe(true);
  });

  it("detects CLI-specific noise", () => {
    expect(isCliNoiseLine("YOLO mode is enabled")).toBe(true);
    expect(isCliNoiseLine("Hook registry initialized")).toBe(true);
    expect(isCliNoiseLine("Loaded cached credentials")).toBe(true);
  });

  it("detects token/cost metrics", () => {
    expect(isCliNoiseLine("  tokens used")).toBe(true);
    expect(isCliNoiseLine("  input tokens")).toBe(true);
    expect(isCliNoiseLine("  output tokens")).toBe(true);
    expect(isCliNoiseLine("  total cost")).toBe(true);
    expect(isCliNoiseLine("  session cost")).toBe(true);
    expect(isCliNoiseLine("  duration")).toBe(true);
  });

  it("detects timing lines", () => {
    expect(isCliNoiseLine("12.5s")).toBe(true);
    expect(isCliNoiseLine("  3.2s  ")).toBe(true);
  });

  it("returns false for meaningful content", () => {
    expect(isCliNoiseLine("I modified the file src/index.ts")).toBe(false);
    expect(isCliNoiseLine("Here is the solution:")).toBe(false);
  });
});

describe("detectRateLimit", () => {
  it("detects rate limit messages", () => {
    expect(detectRateLimit("Error: rate limit exceeded")).not.toBeNull();
    expect(detectRateLimit("Too many requests, slow down")).not.toBeNull();
    expect(detectRateLimit("HTTP 429 error")).not.toBeNull();
    expect(detectRateLimit("quota exceeded for model")).not.toBeNull();
    expect(detectRateLimit("token limit reached")).not.toBeNull();
    expect(detectRateLimit("context length exceeded")).not.toBeNull();
    expect(detectRateLimit("max tokens reached")).not.toBeNull();
    expect(detectRateLimit("server at capacity")).not.toBeNull();
    expect(detectRateLimit("server overloaded")).not.toBeNull();
    expect(detectRateLimit("request throttled")).not.toBeNull();
  });

  it("returns null for normal output", () => {
    expect(detectRateLimit("Here is the code change")).toBeNull();
    expect(detectRateLimit("File updated successfully")).toBeNull();
    expect(detectRateLimit("")).toBeNull();
  });

  it("returns a user-friendly message", () => {
    const msg = detectRateLimit("rate limit reached");
    expect(msg).toContain("usage limit");
    expect(msg).toContain("/switch");
  });
});
