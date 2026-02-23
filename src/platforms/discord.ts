import { Client, GatewayIntentBits, Message, Partials } from "discord.js";
import { AgentCore } from "../core/agent";
import { logger } from "../shared/logger";
import { BlockReplyPipeline } from "../shared/block-reply-pipeline";
import { DiscordTypingSignaler } from "../shared/typing-signaler";
import type { StreamChunk } from "../shared/streaming-types";

export class DiscordBot {
  private client: Client;
  private agent: AgentCore;

  constructor(agent: AgentCore) {
    this.agent = agent;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    this.client.once("ready", () => {
      logger.info(`Discord bot logged in as ${this.client.user?.tag}!`);
      logger.info("Waiting for messages...");
    });

    this.client.on("messageCreate", async (message: Message) => {
      if (message.author.bot) {
        return;
      }

      if (message.guild && !message.mentions.has(this.client.user!)) {
        return;
      }

      const from = message.author.id;
      const text = message.content.replace(`<@${this.client.user?.id}>`, "").trim();

      if (!text) {
        return;
      }

      logger.debug(`Incoming message from ${message.author.tag}: ${text}`);

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
          await message.reply(response);
          logger.debug(`Replied: ${response}`);
        } catch (error: any) {
          logger.error("Failed to send Discord message", error);
        }
        return;
      }

      // CODE mode - use streaming with block reply pipeline
      let taskStartTime = Date.now();
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let progressMessage: Message | null = null;

      // Send initial "working" message immediately
      try {
        progressMessage = await message.reply(`⏳ Working on your request...`);
        logger.debug(`[PROGRESS] Sent initial working message`);
      } catch (error) {
        logger.debug(`Failed to send initial message: ${error}`);
      }

      // Create typing signaler
      const typingSignaler = new DiscordTypingSignaler(message.channel);

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
            if (progressMessage) {
              await (progressMessage as Message).edit(
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
          if (progressMessage) {
            await (progressMessage as Message).edit(`⏳ Still working... (${elapsed}s elapsed)`);
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
          if (progressMessage) {
            await (progressMessage as Message).edit(response);
          } else {
            await message.reply(response);
          }
          logger.debug(`Replied: ${response}`);
        } catch (error: any) {
          logger.error("Failed to send Discord message", error);
          try {
            const fallbackMsg = "[OK] Task completed, but output was too long to display.";
            if (progressMessage) {
              await (progressMessage as Message).edit(fallbackMsg);
            } else {
              await message.reply(fallbackMsg);
            }
          } catch (fallbackError) {
            logger.error("Failed to send fallback message", fallbackError);
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

    this.client.on("error", (error) => {
      logger.error("Discord client error", error);
    });
  }

  async start() {
    const token = process.env.DISCORD_BOT_TOKEN;

    if (!token) {
      throw new Error("DISCORD_BOT_TOKEN not set in config");
    }

    logger.info("Connecting to Discord...");
    await this.client.login(token);
  }
}
