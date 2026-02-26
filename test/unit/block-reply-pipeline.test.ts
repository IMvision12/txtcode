import { describe, it, expect, vi } from "vitest";
import { BlockReplyPipeline } from "../../src/shared/block-reply-pipeline";
import type { StreamChunk } from "../../src/shared/streaming-types";
import type { TypingSignaler } from "../../src/shared/typing-signaler";

function createMockSignaler(): TypingSignaler {
  return {
    signalTyping: vi.fn().mockResolvedValue(undefined),
    signalTextDelta: vi.fn().mockResolvedValue(undefined),
    stopTyping: vi.fn().mockResolvedValue(undefined),
  };
}

describe("BlockReplyPipeline", () => {
  it("accumulates text and makes it available via getAccumulatedText", async () => {
    const chunks: StreamChunk[] = [];
    const signaler = createMockSignaler();

    const pipeline = new BlockReplyPipeline({
      chunking: { minChars: 5, maxChars: 500, breakPreference: "newline" },
      typingSignaler: signaler,
      onChunk: async (chunk) => {
        chunks.push(chunk);
      },
    });

    await pipeline.processText("Hello ");
    await pipeline.processText("World");

    expect(pipeline.getAccumulatedText()).toBe("HelloWorld");
  });

  it("sends accumulated text on flush with isComplete=true", async () => {
    const chunks: StreamChunk[] = [];
    const signaler = createMockSignaler();

    const pipeline = new BlockReplyPipeline({
      chunking: { minChars: 1000, maxChars: 5000, breakPreference: "newline" },
      typingSignaler: signaler,
      onChunk: async (chunk) => {
        chunks.push(chunk);
      },
    });

    await pipeline.processText("Some output text");
    await pipeline.flush();

    const lastChunk = chunks[chunks.length - 1];
    expect(lastChunk).toBeDefined();
    expect(lastChunk.isComplete).toBe(true);
    expect(lastChunk.text).toBe("Some output text");
  });

  it("calls typingSignaler.signalTextDelta on each processText", async () => {
    const signaler = createMockSignaler();

    const pipeline = new BlockReplyPipeline({
      chunking: { minChars: 1000, maxChars: 5000, breakPreference: "newline" },
      typingSignaler: signaler,
      onChunk: vi.fn(),
    });

    await pipeline.processText("Hello");
    await pipeline.processText("World");

    expect(signaler.signalTextDelta).toHaveBeenCalledTimes(2);
  });

  it("calls typingSignaler.stopTyping on flush", async () => {
    const signaler = createMockSignaler();

    const pipeline = new BlockReplyPipeline({
      chunking: { minChars: 1000, maxChars: 5000, breakPreference: "newline" },
      typingSignaler: signaler,
      onChunk: vi.fn(),
    });

    await pipeline.processText("text");
    await pipeline.flush();

    expect(signaler.stopTyping).toHaveBeenCalled();
  });

  it("skips empty/whitespace-only text from normalizer", async () => {
    const chunks: StreamChunk[] = [];
    const signaler = createMockSignaler();

    const pipeline = new BlockReplyPipeline({
      chunking: { minChars: 5, maxChars: 500, breakPreference: "newline" },
      typingSignaler: signaler,
      onChunk: async (chunk) => {
        chunks.push(chunk);
      },
    });

    await pipeline.processText("   ");
    expect(pipeline.getAccumulatedText()).toBe("");
  });

  it("strips ANSI from accumulated text via normalizer", async () => {
    const signaler = createMockSignaler();

    const pipeline = new BlockReplyPipeline({
      chunking: { minChars: 1000, maxChars: 5000, breakPreference: "newline" },
      typingSignaler: signaler,
      onChunk: vi.fn(),
    });

    await pipeline.processText("\x1b[32mGreen text\x1b[0m");
    expect(pipeline.getAccumulatedText()).toBe("Green text");
  });

  it("reset clears accumulated text", async () => {
    const signaler = createMockSignaler();

    const pipeline = new BlockReplyPipeline({
      chunking: { minChars: 1000, maxChars: 5000, breakPreference: "newline" },
      typingSignaler: signaler,
      onChunk: vi.fn(),
    });

    await pipeline.processText("something");
    pipeline.reset();
    expect(pipeline.getAccumulatedText()).toBe("");
  });

  it("is resilient to onChunk errors", async () => {
    const signaler = createMockSignaler();

    const pipeline = new BlockReplyPipeline({
      chunking: { minChars: 5, maxChars: 20, breakPreference: "newline" },
      typingSignaler: signaler,
      onChunk: async () => {
        throw new Error("Network error");
      },
    });

    // Should not throw
    await pipeline.processText("A long enough line of text that triggers a chunk\n");
    await pipeline.flush();
  });
});
