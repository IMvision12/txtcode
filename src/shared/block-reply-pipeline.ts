/**
 * Block Reply Pipeline - manages intelligent streaming of CLI output
 * Inspired by OpenClaw's BlockReplyPipeline
 */

import { BlockChunker } from "./block-chunker";
import { normalizeStreamOutput } from "./stream-normalizer";
import type { BlockChunkingConfig, StreamChunk } from "./streaming-types";
import type { TypingSignaler } from "./typing-signaler";

export interface BlockReplyPipelineConfig {
  chunking: BlockChunkingConfig;
  typingSignaler: TypingSignaler;
  onChunk: (chunk: StreamChunk) => Promise<void>;
}

export class BlockReplyPipeline {
  private chunker: BlockChunker;
  private config: BlockReplyPipelineConfig;
  private sentChunks: Set<string> = new Set();
  private lastChunkTime: number = 0;
  private minChunkInterval: number = 2000; // Minimum 2 seconds between chunks

  constructor(config: BlockReplyPipelineConfig) {
    this.config = config;
    this.chunker = new BlockChunker(config.chunking);
  }

  /**
   * Process incoming text from CLI
   */
  async processText(text: string): Promise<void> {
    // Normalize the text
    const normalized = normalizeStreamOutput(text);
    if (normalized.skip) {
      return;
    }

    // Signal typing
    await this.config.typingSignaler.signalTextDelta(normalized.text);

    // Add to chunker
    const chunks = this.chunker.addText(normalized.text);

    // Send chunks that are ready
    for (const chunkText of chunks) {
      await this.sendChunk(chunkText, false);
    }
  }

  /**
   * Flush remaining buffer
   */
  async flush(options: { force?: boolean } = {}): Promise<void> {
    const remaining = this.chunker.flush();
    if (remaining) {
      await this.sendChunk(remaining, true);
    }

    // Stop typing indicator
    await this.config.typingSignaler.stopTyping();
  }

  /**
   * Send a chunk to the platform
   */
  private async sendChunk(text: string, isComplete: boolean): Promise<void> {
    // Create chunk key to prevent duplicates
    const chunkKey = `${text.slice(0, 50)}_${text.length}`;
    if (this.sentChunks.has(chunkKey)) {
      return;
    }

    // Respect minimum interval between chunks
    const now = Date.now();
    if (!isComplete && now - this.lastChunkTime < this.minChunkInterval) {
      return;
    }

    const chunk: StreamChunk = {
      text,
      timestamp: now,
      isComplete,
    };

    try {
      await this.config.onChunk(chunk);
      this.sentChunks.add(chunkKey);
      this.lastChunkTime = now;
    } catch (error) {
      // Log error but don't throw - streaming should be resilient
      console.error("Failed to send chunk:", error);
    }
  }

  /**
   * Reset the pipeline
   */
  reset(): void {
    this.sentChunks.clear();
    this.lastChunkTime = 0;
  }
}
