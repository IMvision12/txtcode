import { Telegraf } from "telegraf";
import { AgentCore } from "../core/agent";
import { logger } from "../shared/logger";

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

      // CODE mode - use streaming with heartbeat
      let progressMessageId: number | null = null;
      let progressBuffer = "";
      let taskStartTime = Date.now();
      let heartbeatInterval: NodeJS.Timeout | null = null;

      // Send initial "working" message
      try {
        const msg = await ctx.reply(`⏳ Working on your request...`);
        progressMessageId = msg.message_id;
        logger.debug(`[PROGRESS] Sent initial working message`);
      } catch (error) {
        logger.debug(`Failed to send initial message: ${error}`);
      }

      // Start heartbeat to send periodic updates every 5 seconds
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
      }, 5000);

      try {
        const response = await this.agent.processMessage(
          {
            from,
            text,
            timestamp: new Date(),
          },
          async (chunk: string) => {
            // Accumulate progress updates
            progressBuffer += chunk;

            // When we get actual output, send it immediately
            const preview = this.formatProgress(progressBuffer);

            try {
              if (progressMessageId) {
                await ctx.telegram.editMessageText(
                  ctx.chat.id,
                  progressMessageId,
                  undefined,
                  `⏳ Progress...\n\`\`\`\n${preview}\n\`\`\``,
                );
              }
            } catch (error) {
              logger.debug(`Failed to update progress message: ${error}`);
            }
          },
        );

        // Clear heartbeat
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }

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

  private formatProgress(buffer: string): string {
    // Extract last 300 chars for preview
    const lines = buffer.split("\n").filter((l) => l.trim());
    const lastLines = lines.slice(-5).join("\n");
    return lastLines.slice(-300);
  }
}
