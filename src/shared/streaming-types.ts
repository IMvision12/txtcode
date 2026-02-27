export type StreamingMode = "off" | "partial" | "block" | "progress";

export type ChunkBreakPreference = "paragraph" | "newline" | "sentence";

export interface BlockChunkingConfig {
  minChars: number;
  maxChars: number;
  breakPreference: ChunkBreakPreference;
  flushOnParagraph?: boolean;
}

export interface StreamChunk {
  text: string;
  timestamp: number;
  isComplete: boolean;
}

export interface NormalizedStreamOutput {
  text: string;
  skip: boolean;
  stripped?: {
    ansi: boolean;
    heartbeat: boolean;
    control: boolean;
  };
}
