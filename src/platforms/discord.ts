import {
  Client,
  type DMChannel,
  GatewayIntentBits,
  Message,
  type NewsChannel,
  Partials,
  type TextChannel,
} from "discord.js";
import { AgentCore } from "../core/agent";
import { BlockReplyPipeline } from "../shared/block-reply-pipeline";
import { logger } from "../shared/logger";
import type { StreamChunk } from "../shared/streaming-types";
import { DiscordTypingSignaler } from "../shared/typing-signaler";

const MAX_DISCORD_LENGTH = 2000;

interface ActiveRequest {
  heartbeatInterval: NodeJS.Timeout | null;
  progressMessage: Message | null;
  aborted: boolean;
}

export class DiscordBot {
  private client: Client;
  private agent: AgentCore;
  private activeRequests: Map<string, ActiveRequest> = new Map();

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

      if (!this.agent.shouldStream(from, text)) {
        const prev = this.activeRequests.get(from);
        this.cleanupRequest(from);

        if (prev?.progressMessage) {
          try {
            await prev.progressMessage.edit("Cancelled.");
          } catch {
            // ignore
          }
        }

        const response = await this.agent.processMessage({ from, text, timestamp: new Date() });
        try {
          await this.sendLongReply(message, response);
        } catch (error) {
          logger.error("Failed to send Discord message", error);
        }
        return;
      }

      const prev = this.activeRequests.get(from);
      if (prev) {
        this.cleanupRequest(from);
        if (prev.progressMessage) {
          try {
            await prev.progressMessage.edit("Cancelled (new request received).");
          } catch {
            // ignore
          }
        }
      }

      const active: ActiveRequest = {
        heartbeatInterval: null,
        progressMessage: null,
        aborted: false,
      };
      this.activeRequests.set(from, active);

      let lastEditText = "";
      const taskStartTime = Date.now();

      try {
        active.progressMessage = await message.reply("Working on your request...");
        lastEditText = "Working on your request...";
      } catch (error) {
        logger.debug(`Failed to send initial message: ${error}`);
      }

      const typingSignaler = new DiscordTypingSignaler(message.channel);

      const pipeline = new BlockReplyPipeline({
        chunking: {
          minChars: 200,
          maxChars: 800,
          breakPreference: "paragraph",
          flushOnParagraph: true,
        },
        typingSignaler,
        onChunk: async (chunk: StreamChunk) => {
          if (active.aborted || !active.progressMessage) {
            return;
          }
          const preview = truncate(chunk.text, MAX_DISCORD_LENGTH - 50);
          if (preview === lastEditText) {
            return;
          }
          try {
            await active.progressMessage.edit(preview);
            lastEditText = preview;
          } catch {
            // ignore
          }
        },
      });

      active.heartbeatInterval = setInterval(async () => {
        if (active.aborted || !active.progressMessage) {
          return;
        }
        const elapsed = Math.floor((Date.now() - taskStartTime) / 1000);
        const msg = `Still working... (${elapsed}s)`;
        if (msg === lastEditText) {
          return;
        }
        try {
          await active.progressMessage.edit(msg);
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

        const finalText = truncate(response, MAX_DISCORD_LENGTH);

        try {
          if (active.progressMessage) {
            if (finalText !== lastEditText) {
              await active.progressMessage.edit(finalText);
            }
          } else {
            await this.sendLongReply(message, response);
          }
        } catch {
          try {
            const fallback = "Task completed, but the output was too long to display.";
            if (active.progressMessage) {
              await active.progressMessage.edit(fallback);
            } else {
              await message.reply(fallback);
            }
          } catch (fallbackError) {
            logger.error("Failed to send fallback message", fallbackError);
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
        if (active.progressMessage) {
          try {
            await active.progressMessage.edit(errMsg);
          } catch {
            // ignore
          }
        }
      }
    });

    this.client.on("error", (error) => {
      logger.error("Discord client error", error);
    });
  }

  private async sendLongReply(message: Message, text: string): Promise<void> {
    if (text.length <= MAX_DISCORD_LENGTH) {
      await message.reply(text);
      return;
    }
    const parts = splitMessage(text, MAX_DISCORD_LENGTH);
    for (let i = 0; i < parts.length; i++) {
      if (i === 0) {
        await message.reply(parts[i]);
      } else {
        await (message.channel as TextChannel | DMChannel | NewsChannel).send(parts[i]);
      }
    }
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
