import type { BlockChunkingConfig } from "./streaming-types";

export class BlockChunker {
  private buffer: string = "";
  private config: BlockChunkingConfig;

  constructor(config: BlockChunkingConfig) {
    this.config = config;
  }

  addText(text: string): string[] {
    this.buffer += text;
    return this.extractChunks();
  }

  flush(): string | null {
    if (!this.buffer.trim()) {
      return null;
    }
    const chunk = this.buffer;
    this.buffer = "";
    return chunk;
  }

  private extractChunks(): string[] {
    const chunks: string[] = [];

    while (this.buffer.length >= this.config.minChars) {
      if (this.buffer.length >= this.config.maxChars) {
        const breakPoint = this.findBreakPoint(this.config.maxChars);
        if (breakPoint > 0) {
          chunks.push(this.buffer.slice(0, breakPoint));
          this.buffer = this.buffer.slice(breakPoint);
        } else {
          chunks.push(this.buffer.slice(0, this.config.maxChars));
          this.buffer = this.buffer.slice(this.config.maxChars);
        }
        continue;
      }

      const breakPoint = this.findNaturalBreak();
      if (breakPoint > 0 && breakPoint >= this.config.minChars) {
        chunks.push(this.buffer.slice(0, breakPoint));
        this.buffer = this.buffer.slice(breakPoint);
      } else {
        break;
      }
    }

    return chunks;
  }

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

  private findParagraphBreak(): number {
    const match = this.buffer.match(/\n\n/);
    if (match && match.index !== undefined) {
      return match.index + 2;
    }
    return this.findSentenceBreak();
  }

  private findSentenceBreak(): number {
    const match = this.buffer.match(/[.!?][\s\n]/);
    if (match && match.index !== undefined) {
      return match.index + 2;
    }
    return this.findNewlineBreak();
  }

  private findNewlineBreak(): number {
    const index = this.buffer.indexOf("\n");
    return index >= 0 ? index + 1 : -1;
  }

  private findBreakPoint(targetPos: number): number {
    const searchStart = Math.max(0, targetPos - 50);
    const searchText = this.buffer.slice(searchStart, targetPos);

    let lastBreak = searchText.lastIndexOf("\n\n");
    if (lastBreak >= 0) {
      return searchStart + lastBreak + 2;
    }

    const sentenceMatch = searchText.match(/[.!?][\s\n]/g);
    if (sentenceMatch) {
      lastBreak = searchText.lastIndexOf(sentenceMatch[sentenceMatch.length - 1]);
      if (lastBreak >= 0) {
        return searchStart + lastBreak + 2;
      }
    }

    lastBreak = searchText.lastIndexOf("\n");
    if (lastBreak >= 0) {
      return searchStart + lastBreak + 1;
    }

    lastBreak = searchText.lastIndexOf(" ");
    if (lastBreak >= 0) {
      return searchStart + lastBreak + 1;
    }

    return -1;
  }
}
