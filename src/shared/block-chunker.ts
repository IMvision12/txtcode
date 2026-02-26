/**
 * Intelligent text chunking for streaming output
 * Inspired by OpenClaw's block reply pipeline
 */

import type { BlockChunkingConfig } from "./streaming-types";

export class BlockChunker {
  private buffer: string = "";
  private config: BlockChunkingConfig;

  constructor(config: BlockChunkingConfig) {
    this.config = config;
  }

  /**
   * Add text to buffer and return chunks ready to send
   */
  addText(text: string): string[] {
    this.buffer += text;
    return this.extractChunks();
  }

  /**
   * Flush remaining buffer
   */
  flush(): string | null {
    if (!this.buffer.trim()) {
      return null;
    }
    const chunk = this.buffer;
    this.buffer = "";
    return chunk;
  }

  /**
   * Extract chunks from buffer based on config
   */
  private extractChunks(): string[] {
    const chunks: string[] = [];

    while (this.buffer.length >= this.config.minChars) {
      // If buffer exceeds maxChars, force a break
      if (this.buffer.length >= this.config.maxChars) {
        const breakPoint = this.findBreakPoint(this.config.maxChars);
        if (breakPoint > 0) {
          chunks.push(this.buffer.slice(0, breakPoint));
          this.buffer = this.buffer.slice(breakPoint);
        } else {
          // No good break point, force break at maxChars
          chunks.push(this.buffer.slice(0, this.config.maxChars));
          this.buffer = this.buffer.slice(this.config.maxChars);
        }
        continue;
      }

      // Check for natural break points
      const breakPoint = this.findNaturalBreak();
      if (breakPoint > 0 && breakPoint >= this.config.minChars) {
        chunks.push(this.buffer.slice(0, breakPoint));
        this.buffer = this.buffer.slice(breakPoint);
      } else {
        // Not enough content for a natural break
        break;
      }
    }

    return chunks;
  }

  /**
   * Find natural break point based on preference
   */
  private findNaturalBreak(): number {
    switch (this.config.breakPreference) {
      case "paragraph":
        return this.findParagraphBreak();
      case "sentence":
        return this.findSentenceBreak();
      case "newline":
      default:
        return this.findNewlineBreak();
    }
  }

  /**
   * Find paragraph break (double newline)
   */
  private findParagraphBreak(): number {
    const match = this.buffer.match(/\n\n/);
    if (match && match.index !== undefined) {
      return match.index + 2;
    }
    // Fallback to sentence break
    return this.findSentenceBreak();
  }

  /**
   * Find sentence break (. ! ? followed by space or newline)
   */
  private findSentenceBreak(): number {
    const match = this.buffer.match(/[.!?][\s\n]/);
    if (match && match.index !== undefined) {
      return match.index + 2;
    }
    // Fallback to newline break
    return this.findNewlineBreak();
  }

  /**
   * Find newline break
   */
  private findNewlineBreak(): number {
    const index = this.buffer.indexOf("\n");
    return index >= 0 ? index + 1 : -1;
  }

  /**
   * Find best break point near target position
   */
  private findBreakPoint(targetPos: number): number {
    // Look for break within 50 chars before target
    const searchStart = Math.max(0, targetPos - 50);
    const searchText = this.buffer.slice(searchStart, targetPos);

    // Try paragraph break first
    let lastBreak = searchText.lastIndexOf("\n\n");
    if (lastBreak >= 0) {
      return searchStart + lastBreak + 2;
    }

    // Try sentence break
    const sentenceMatch = searchText.match(/[.!?][\s\n]/g);
    if (sentenceMatch) {
      lastBreak = searchText.lastIndexOf(sentenceMatch[sentenceMatch.length - 1]);
      if (lastBreak >= 0) {
        return searchStart + lastBreak + 2;
      }
    }

    // Try newline break
    lastBreak = searchText.lastIndexOf("\n");
    if (lastBreak >= 0) {
      return searchStart + lastBreak + 1;
    }

    // Try space break
    lastBreak = searchText.lastIndexOf(" ");
    if (lastBreak >= 0) {
      return searchStart + lastBreak + 1;
    }

    // No good break point found
    return -1;
  }
}
