import { App } from "@slack/bolt";
import { AgentCore } from "../core/agent";
import { BlockReplyPipeline } from "../shared/block-reply-pipeline";
import { logger } from "../shared/logger";
import type { StreamChunk } from "../shared/streaming-types";
import { SlackTypingSignaler } from "../shared/typing-signaler";

const MAX_SLACK_LENGTH = 4000;

interface ActiveRequest {
  heartbeatInterval: NodeJS.Timeout | null;
  progressMessageTs: string | null;
  channel: string;
  aborted: boolean;
}

export class SlackBot {
  private app: App;
  private agent: AgentCore;
  private activeRequests: Map<string, ActiveRequest> = new Map();

  constructor(agent: AgentCore) {
    this.agent = agent;

    const token = process.env.SLACK_BOT_TOKEN;
    const appToken = process.env.SLACK_APP_TOKEN;
    const signingSecret = process.env.SLACK_SIGNING_SECRET;

    if (!token) {
      throw new Error("SLACK_BOT_TOKEN not set in config");
    }
    if (!appToken) {
      throw new Error("SLACK_APP_TOKEN not set in config");
    }
    if (!signingSecret) {
      throw new Error("SLACK_SIGNING_SECRET not set in config");
    }

    this.app = new App({
      token,
      appToken,
      signingSecret,
      socketMode: true,
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
    this.app.message(async ({ message, client }) => {
      const msg = message as unknown as Record<string, unknown>;
      if (msg.subtype || msg.bot_id) {
        return;
      }

      const from = msg.user as string | undefined;
      const text = (msg.text as string) || "";
      const channel = msg.channel as string;

      if (!from || !text) {
        return;
      }

      logger.debug(`Incoming Slack message from ${from}: ${text}`);

      if (!this.agent.shouldStream(from, text)) {
        const prev = this.activeRequests.get(from);
        this.cleanupRequest(from);

        if (prev?.progressMessageTs) {
          try {
            await client.chat.update({
              channel: prev.channel,
              ts: prev.progressMessageTs,
              text: "Cancelled.",
            });
          } catch {
            // ignore
          }
        }

        const response = await this.agent.processMessage({ from, text, timestamp: new Date() });
        try {
          await this.sendLongMessage(client, channel, response, msg.ts as string);
        } catch (error) {
          logger.error("Failed to send Slack message", error);
        }
        return;
      }

      const prev = this.activeRequests.get(from);
      if (prev) {
        this.cleanupRequest(from);
        if (prev.progressMessageTs) {
          try {
            await client.chat.update({
              channel: prev.channel,
              ts: prev.progressMessageTs,
              text: "Cancelled (new request received).",
            });
          } catch {
            // ignore
          }
        }
      }

      const active: ActiveRequest = {
        heartbeatInterval: null,
        progressMessageTs: null,
        channel,
        aborted: false,
      };
      this.activeRequests.set(from, active);

      let lastEditText = "";
      const taskStartTime = Date.now();

      try {
        const ts = await this.postSlackMessage(client, {
          channel,
          text: "Working on your request...",
          thread_ts: msg.ts as string,
        });
        active.progressMessageTs = ts || null;
        lastEditText = "Working on your request...";
      } catch (error) {
        logger.debug(`Failed to send initial message: ${error}`);
      }

      const typingSignaler = new SlackTypingSignaler();

      const pipeline = new BlockReplyPipeline({
        chunking: {
          minChars: 200,
          maxChars: 800,
          breakPreference: "paragraph",
          flushOnParagraph: true,
        },
        typingSignaler,
        onChunk: async (chunk: StreamChunk) => {
          if (active.aborted || !active.progressMessageTs) {
            return;
          }
          const preview = truncate(chunk.text, MAX_SLACK_LENGTH - 50);
          if (preview === lastEditText) {
            return;
          }
          try {
            await client.chat.update({
              channel,
              ts: active.progressMessageTs,
              text: preview,
            });
            lastEditText = preview;
          } catch {
            // ignore
          }
        },
      });

      active.heartbeatInterval = setInterval(async () => {
        if (active.aborted || !active.progressMessageTs) {
          return;
        }
        const elapsed = Math.floor((Date.now() - taskStartTime) / 1000);
        const heartbeatMsg = `Still working... (${elapsed}s)`;
        if (heartbeatMsg === lastEditText) {
          return;
        }
        try {
          await client.chat.update({
            channel,
            ts: active.progressMessageTs,
            text: heartbeatMsg,
          });
          lastEditText = heartbeatMsg;
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

        const finalText = truncate(response, MAX_SLACK_LENGTH);

        try {
          if (active.progressMessageTs) {
            if (finalText !== lastEditText) {
              await client.chat.update({
                channel,
                ts: active.progressMessageTs,
                text: finalText,
              });
            }
          } else {
            await this.sendLongMessage(client, channel, response, msg.ts as string);
          }
        } catch {
          try {
            const fallback = "Task completed, but the output was too long to display.";
            if (active.progressMessageTs) {
              await client.chat.update({
                channel,
                ts: active.progressMessageTs,
                text: fallback,
              });
            } else {
              await this.postSlackMessage(client, {
                channel,
                text: fallback,
                thread_ts: msg.ts as string,
              });
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

        const isAbort = error instanceof Error && error.message.includes("aborted");
        if (isAbort) {
          return;
        }

        const errMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
        if (active.progressMessageTs) {
          try {
            await client.chat.update({
              channel,
              ts: active.progressMessageTs,
              text: errMsg,
            });
          } catch {
            // ignore
          }
        }
      }
    });
  }

  private async postSlackMessage(
    client: InstanceType<typeof App>["client"],
    opts: { channel: string; text: string; thread_ts?: string },
  ): Promise<string | undefined> {
    // Wrapper to avoid oxlint false-positive (unicorn/require-post-message-target-origin)
    // which confuses Slack's chat.postMessage with window.postMessage
    const result = await client.chat.postMessage(opts); // eslint-disable-line unicorn/require-post-message-target-origin
    return result.ts;
  }

  private async sendLongMessage(
    client: InstanceType<typeof App>["client"],
    channel: string,
    text: string,
    threadTs?: string,
  ): Promise<void> {
    if (text.length <= MAX_SLACK_LENGTH) {
      await this.postSlackMessage(client, { channel, text, thread_ts: threadTs });
      return;
    }
    const parts = splitMessage(text, MAX_SLACK_LENGTH);
    for (const part of parts) {
      await this.postSlackMessage(client, { channel, text: part, thread_ts: threadTs });
    }
  }

  async start() {
    logger.info("Starting Slack bot...");
    await this.app.start();
    logger.info("Slack bot is running (Socket Mode)!");
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
