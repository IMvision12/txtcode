import { describe, it, expect } from "vitest";
import { BlockChunker } from "../../src/shared/block-chunker";

describe("BlockChunker", () => {
  it("buffers text below minChars", () => {
    const chunker = new BlockChunker({ minChars: 50, maxChars: 200, breakPreference: "newline" });
    const chunks = chunker.addText("short");
    expect(chunks).toHaveLength(0);
  });

  it("emits chunk at natural newline break when >= minChars", () => {
    const chunker = new BlockChunker({ minChars: 5, maxChars: 200, breakPreference: "newline" });
    const chunks = chunker.addText("Hello world\nSecond line\n");
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toContain("Hello world");
  });

  it("force-breaks at maxChars", () => {
    const chunker = new BlockChunker({ minChars: 5, maxChars: 20, breakPreference: "newline" });
    const text = "A".repeat(50);
    const chunks = chunker.addText(text);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(20);
    }
  });

  it("flushes remaining buffer", () => {
    const chunker = new BlockChunker({ minChars: 100, maxChars: 500, breakPreference: "newline" });
    chunker.addText("remaining text");
    const flushed = chunker.flush();
    expect(flushed).toBe("remaining text");
  });

  it("flush returns null for empty buffer", () => {
    const chunker = new BlockChunker({ minChars: 10, maxChars: 50, breakPreference: "newline" });
    expect(chunker.flush()).toBeNull();
  });

  it("respects paragraph break preference", () => {
    const chunker = new BlockChunker({ minChars: 5, maxChars: 500, breakPreference: "paragraph" });
    const chunks = chunker.addText("First paragraph.\n\nSecond paragraph.\n\n");
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toContain("First paragraph.");
  });

  it("respects sentence break preference", () => {
    const chunker = new BlockChunker({ minChars: 5, maxChars: 500, breakPreference: "sentence" });
    const chunks = chunker.addText("First sentence. Second sentence. ");
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("handles multiple addText calls accumulating buffer", () => {
    const chunker = new BlockChunker({ minChars: 10, maxChars: 100, breakPreference: "newline" });
    chunker.addText("Hello ");
    chunker.addText("World\n");
    const chunks = chunker.addText("More text\n");
    expect(chunks.length).toBeGreaterThan(0);
  });
});
