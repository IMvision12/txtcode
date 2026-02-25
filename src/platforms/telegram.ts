import { Telegraf } from "telegraf";
import { AgentCore } from "../core/agent";
import { BlockReplyPipeline } from "../shared/block-reply-pipeline";
import { logger } from "../shared/logger";
import type { StreamChunk } from "../shared/streaming-types";
import { TelegramTypingSignaler } from "../shared/typing-signaler";

export class TelegramBot {
  private bot: Telegraf;
  private agent: AgentCore;

  constructor(agent: AgentCore) {
    this.agent = agent;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN not set in .env");
    }

    this.bot = new Telegraf(token);
    this.setupHandlers();
  }

  private setupHandlers() {
    this.bot.start((ctx) => {
      ctx.reply("Welcome to TxtCode! Send me coding instructions.");
    });

    this.bot.on("text", async (ctx) => {
      const from = ctx.from.id.toString();
      const text = ctx.message.text;

      logger.debug(`Incoming message from ${from}: ${text}`);

      // Check if this is a command or chat mode - no streaming for these
      const lowerText = text.toLowerCase();
      const isCommand =
        lowerText === "/code" ||
        lowerText === "/chat" ||
        lowerText === "/switch" ||
        lowerText === "help" ||
        lowerText === "/help" ||
        lowerText === "status" ||
        lowerText === "/status" ||
        !this.agent.isUserInCodeMode(from) ||
        this.agent.isPendingSwitch(from);

      // For commands and chat mode, no streaming
      if (isCommand) {
        const response = await this.agent.processMessage({
          from,
          text,
          timestamp: new Date(),
        });
        try {
          await ctx.reply(response);
          logger.debug("Replied successfully");
        } catch (error) {
          logger.error("Failed to send message", error);
        }
        return;
      }

      // CODE mode - use streaming with block reply pipeline
      let taskStartTime = Date.now();
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let progressMessageId: number | null = null;

      // Send initial "working" message immediately
      try {
        const msg = await ctx.reply(`⏳ Working on your request...`);
        progressMessageId = msg.message_id;
        logger.debug(`[PROGRESS] Sent initial working message`);
      } catch (error) {
        logger.debug(`Failed to send initial message: ${error}`);
      }

      // Create typing signaler
      const typingSignaler = new TelegramTypingSignaler(ctx);

      // Create block reply pipeline
      const pipeline = new BlockReplyPipeline({
        chunking: {
          minChars: 150,
          maxChars: 500,
          breakPreference: "paragraph",
          flushOnParagraph: true,
        },
        typingSignaler,
        onChunk: async (chunk: StreamChunk) => {
          try {
            const prefix = chunk.isComplete ? "✅" : "⏳ Progress...";
            if (progressMessageId) {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                progressMessageId,
                undefined,
                `${prefix}\n\`\`\`\n${chunk.text}\n\`\`\``,
              );
            }
            logger.debug(`[PIPELINE] Sent chunk: ${chunk.text.length} chars`);
          } catch (error) {
            logger.debug(`Failed to send chunk: ${error}`);
          }
        },
      });

      // Start heartbeat to send periodic updates every 25 seconds
      heartbeatInterval = setInterval(async () => {
        const elapsed = Math.floor((Date.now() - taskStartTime) / 1000);
        try {
          if (progressMessageId) {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              progressMessageId,
              undefined,
              `⏳ Still working... (${elapsed}s elapsed)`,
            );
          }
          logger.debug(`[HEARTBEAT] Sent periodic update at ${elapsed}s`);
        } catch (error) {
          logger.debug(`Failed to send heartbeat: ${error}`);
        }
      }, 25000);

      try {
        const response = await this.agent.processMessage(
          {
            from,
            text,
            timestamp: new Date(),
          },
          async (chunk: string) => {
            // Process through pipeline
            await pipeline.processText(chunk);
          },
        );

        // Clear heartbeat
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }

        // Flush pipeline
        await pipeline.flush({ force: true });

        try {
          if (progressMessageId) {
            await ctx.telegram.editMessageText(ctx.chat.id, progressMessageId, undefined, response);
          } else {
            await ctx.reply(response);
          }
          logger.debug("Replied successfully");
        } catch (error) {
          logger.error("Failed to send final message", error);
          if (progressMessageId) {
            try {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                progressMessageId,
                undefined,
                "[OK] Task completed",
              );
            } catch {}
          }
        }
      } catch (error) {
        // Clear heartbeat on error
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
        await typingSignaler.stopTyping();
        throw error;
      }
    });
  }

  async start() {
    logger.info("Starting Telegram bot...");
    await this.bot.launch();
    logger.info("Telegram bot is running!");

    process.once("SIGINT", () => this.bot.stop("SIGINT"));
    process.once("SIGTERM", () => this.bot.stop("SIGTERM"));
  }
}
