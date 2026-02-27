import { Telegraf } from "telegraf";
import { AgentCore } from "../core/agent";
import { BlockReplyPipeline } from "../shared/block-reply-pipeline";
import { logger } from "../shared/logger";
import type { StreamChunk } from "../shared/streaming-types";
import { TelegramTypingSignaler } from "../shared/typing-signaler";

const MAX_TELEGRAM_LENGTH = 4096;

interface ActiveRequest {
  heartbeatInterval: NodeJS.Timeout | null;
  progressMessageId: number | null;
  chatId: number;
  aborted: boolean;
}

export class TelegramBot {
  private bot: Telegraf;
  private agent: AgentCore;
  private activeRequests: Map<string, ActiveRequest> = new Map();

  constructor(agent: AgentCore) {
    this.agent = agent;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN not set in .env");
    }

    this.bot = new Telegraf(token);
    this.setupHandlers();
  }

  private cleanupRequest(userId: string) {
    const active = this.activeRequests.get(userId);
    if (!active) {
      return;
    }
    active.aborted = true;
    if (active.heartbeatInterval) {
      clearInterval(active.heartbeatInterval);
    }
    this.activeRequests.delete(userId);
  }

  private setupHandlers() {
    this.bot.start((ctx) => {
      ctx.reply("Welcome to TxtCode! Send me coding instructions.");
    });

    this.bot.on("text", async (ctx) => {
      const from = ctx.from.id.toString();
      const text = ctx.message.text;

      logger.debug(`Incoming message from ${from}: ${text}`);

      if (!this.agent.shouldStream(from, text)) {
        const prev = this.activeRequests.get(from);
        this.cleanupRequest(from);

        if (prev?.progressMessageId) {
          try {
            await ctx.telegram.editMessageText(
              prev.chatId,
              prev.progressMessageId,
              undefined,
              "Cancelled.",
            );
          } catch {
            // ignore
          }
        }

        const response = await this.agent.processMessage({ from, text, timestamp: new Date() });
        try {
          await this.sendLongMessage(ctx, response);
        } catch (error) {
          logger.error("Failed to send message", error);
        }
        return;
      }

      const prev = this.activeRequests.get(from);
      if (prev) {
        this.cleanupRequest(from);
        if (prev.progressMessageId) {
          try {
            await ctx.telegram.editMessageText(
              prev.chatId,
              prev.progressMessageId,
              undefined,
              "Cancelled (new request received).",
            );
          } catch {
            // ignore edit failure
          }
        }
      }

      const active: ActiveRequest = {
        heartbeatInterval: null,
        progressMessageId: null,
        chatId: ctx.chat.id,
        aborted: false,
      };
      this.activeRequests.set(from, active);

      let lastEditText = "";
      const taskStartTime = Date.now();

      try {
        const msg = await ctx.reply("Working on your request...");
        active.progressMessageId = msg.message_id;
        lastEditText = "Working on your request...";
      } catch (error) {
        logger.debug(`Failed to send initial message: ${error}`);
      }

      const typingSignaler = new TelegramTypingSignaler(ctx);

      const pipeline = new BlockReplyPipeline({
        chunking: {
          minChars: 200,
          maxChars: 800,
          breakPreference: "paragraph",
          flushOnParagraph: true,
        },
        typingSignaler,
        onChunk: async (chunk: StreamChunk) => {
          if (active.aborted || !active.progressMessageId) {
            return;
          }
          const preview = truncate(chunk.text, MAX_TELEGRAM_LENGTH - 50);
          if (preview === lastEditText) {
            return;
          }
          try {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              active.progressMessageId,
              undefined,
              preview,
            );
            lastEditText = preview;
          } catch {
            // ignore
          }
        },
      });

      active.heartbeatInterval = setInterval(async () => {
        if (active.aborted) {
          return;
        }
        const elapsed = Math.floor((Date.now() - taskStartTime) / 1000);
        if (!active.progressMessageId) {
          return;
        }
        const msg = `Still working... (${elapsed}s)`;
        if (msg === lastEditText) {
          return;
        }
        try {
          await ctx.telegram.editMessageText(ctx.chat.id, active.progressMessageId, undefined, msg);
          lastEditText = msg;
        } catch {
          // ignore
        }
      }, 25000);

      try {
        const response = await this.agent.processMessage(
          { from, text, timestamp: new Date() },
          async (chunk: string) => {
            if (!active.aborted) {
              await pipeline.processText(chunk);
            }
          },
        );

        if (active.aborted) {
          return;
        }

        if (active.heartbeatInterval) {
          clearInterval(active.heartbeatInterval);
        }
        this.activeRequests.delete(from);
        await pipeline.flush();

        const finalText = truncate(response, MAX_TELEGRAM_LENGTH);

        try {
          if (active.progressMessageId) {
            if (finalText !== lastEditText) {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                active.progressMessageId,
                undefined,
                finalText,
              );
            }
          } else {
            await this.sendLongMessage(ctx, response);
          }
        } catch {
          try {
            if (active.progressMessageId) {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                active.progressMessageId,
                undefined,
                "Task completed.",
              );
            }
          } catch {
            // give up
          }
        }
      } catch (error) {
        if (active.aborted) {
          return;
        }

        if (active.heartbeatInterval) {
          clearInterval(active.heartbeatInterval);
        }
        this.activeRequests.delete(from);
        await typingSignaler.stopTyping();

        const isAbort = error instanceof Error && error.message.includes("aborted");
        if (isAbort) {
          return;
        }

        const errMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
        if (active.progressMessageId) {
          try {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              active.progressMessageId,
              undefined,
              errMsg,
            );
          } catch {
            // ignore
          }
        }
      }
    });
  }

  private async sendLongMessage(
    ctx: { reply: (text: string) => Promise<unknown> },
    text: string,
  ): Promise<void> {
    if (text.length <= MAX_TELEGRAM_LENGTH) {
      await ctx.reply(text);
      return;
    }
    const parts = splitMessage(text, MAX_TELEGRAM_LENGTH);
    for (const part of parts) {
      await ctx.reply(part);
    }
  }

  async start() {
    logger.info("Starting Telegram bot...");
    await this.bot.launch();
    logger.info("Telegram bot is running!");

    process.once("SIGINT", () => this.bot.stop("SIGINT"));
    if (process.platform !== "win32") {
      process.once("SIGTERM", () => this.bot.stop("SIGTERM"));
    }
    process.once("beforeExit", () => this.bot.stop("beforeExit"));
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return text.slice(0, max - 20) + "\n\n... (truncated)";
}

function splitMessage(text: string, max: number): string[] {
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= max) {
      parts.push(remaining);
      break;
    }
    let breakAt = remaining.lastIndexOf("\n", max);
    if (breakAt < max / 2) {
      breakAt = max;
    }
    parts.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt);
  }
  return parts;
}
