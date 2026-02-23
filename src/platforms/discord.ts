import { Client, GatewayIntentBits, Message, Partials } from "discord.js";
import { AgentCore } from "../core/agent";
import { logger } from "../shared/logger";

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

      // CODE mode - use streaming with heartbeat
      if ("sendTyping" in message.channel) {
        await message.channel.sendTyping();
      }

      let progressMessage: Message | null = null;
      let progressBuffer = "";
      let taskStartTime = Date.now();
      let heartbeatInterval: NodeJS.Timeout | null = null;

      // Send initial "working" message
      try {
        progressMessage = await message.reply(`⏳ Working on your request...`);
        logger.debug(`[PROGRESS] Sent initial working message`);
      } catch (error) {
        logger.debug(`Failed to send initial message: ${error}`);
      }

      // Start heartbeat to send periodic updates every 5 seconds
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
              if (progressMessage) {
                await (progressMessage as Message).edit(
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

  private formatProgress(buffer: string): string {
    // Extract last 300 chars for preview
    const lines = buffer.split("\n").filter((l) => l.trim());
    const lastLines = lines.slice(-5).join("\n");
    return lastLines.slice(-300);
  }
}
