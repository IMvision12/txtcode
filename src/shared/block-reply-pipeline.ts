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
  private accumulatedText: string = "";

  constructor(config: BlockReplyPipelineConfig) {
    this.config = config;
    this.chunker = new BlockChunker(config.chunking);
  }

  async processText(text: string): Promise<void> {
    const normalized = normalizeStreamOutput(text);
    if (normalized.skip) {return;}

    this.accumulatedText += normalized.text;

    await this.config.typingSignaler.signalTextDelta(normalized.text);

    const chunks = this.chunker.addText(normalized.text);

    for (const _chunkText of chunks) {
      await this.sendChunk(false);
    }
  }

  async flush(): Promise<void> {
    this.chunker.flush();
    if (this.accumulatedText.trim()) {
      await this.sendChunk(true);
    }
    await this.config.typingSignaler.stopTyping();
  }

  getAccumulatedText(): string {
    return this.accumulatedText;
  }

  private async sendChunk(isComplete: boolean): Promise<void> {
    const chunk: StreamChunk = {
      text: this.accumulatedText,
      timestamp: Date.now(),
      isComplete,
    };

    try {
      await this.config.onChunk(chunk);
    } catch {
      // Streaming should be resilient
    }
  }

  reset(): void {
    this.accumulatedText = "";
  }
}
