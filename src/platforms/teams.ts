import {
  ActivityTypes,
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  type ConfigurationBotFrameworkAuthenticationOptions,
  type TurnContext,
} from "botbuilder";
import { AgentCore } from "../core/agent";
import { BlockReplyPipeline } from "../shared/block-reply-pipeline";
import { logger } from "../shared/logger";
import type { StreamChunk } from "../shared/streaming-types";
import { TeamsTypingSignaler } from "../shared/typing-signaler";
import http from "http";

const MAX_TEAMS_LENGTH = 4096;

interface ActiveRequest {
  heartbeatInterval: NodeJS.Timeout | null;
  activityId: string | null;
  aborted: boolean;
}

function adaptRequest(req: http.IncomingMessage): Record<string, unknown> {
  return new Promise<Record<string, unknown>>((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(body);
      } catch {
        // not JSON
      }
      resolve({
        body: parsed,
        headers: req.headers,
        method: req.method,
        on: req.on.bind(req),
      });
    });
  }) as unknown as Record<string, unknown>;
}

function adaptResponse(res: http.ServerResponse): Record<string, unknown> {
  return {
    socket: res.socket,
    header(name: string, value: unknown) {
      res.setHeader(name, String(value));
      return this;
    },
    send(body: unknown) {
      if (typeof body === "object") {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(body));
      } else {
        res.end(String(body ?? ""));
      }
      return this;
    },
    status(code: number) {
      res.statusCode = code;
      return this;
    },
    end(...args: unknown[]) {
      res.end(...(args as Parameters<typeof res.end>));
      return this;
    },
  };
}

export class TeamsBot {
  private adapter: CloudAdapter;
  private agent: AgentCore;
  private activeRequests: Map<string, ActiveRequest> = new Map();

  constructor(agent: AgentCore) {
    this.agent = agent;

    const authConfig: ConfigurationBotFrameworkAuthenticationOptions = {
      MicrosoftAppId: process.env.TEAMS_APP_ID || "",
      MicrosoftAppTenantId: process.env.TEAMS_TENANT_ID || "",
    };

    const botFrameworkAuth = new ConfigurationBotFrameworkAuthentication(authConfig);
    this.adapter = new CloudAdapter(botFrameworkAuth);

    this.adapter.onTurnError = async (context: TurnContext, error: Error) => {
      logger.error("Teams adapter error", error);
      try {
        await context.sendActivity("An error occurred processing your request.");
      } catch {
        // ignore
      }
    };
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

  private async handleMessage(context: TurnContext) {
    if (context.activity.type !== ActivityTypes.Message) {
      return;
    }

    const from = context.activity.from?.id || "";
    const text = (context.activity.text || "").replace(/<at>.*?<\/at>/g, "").trim();

    if (!from || !text) {
      return;
    }

    logger.debug(`Incoming Teams message from ${from}: ${text}`);

    if (!this.agent.shouldStream(from, text)) {
      const prev = this.activeRequests.get(from);
      this.cleanupRequest(from);

      if (prev?.activityId) {
        try {
          await context.updateActivity({
            id: prev.activityId,
            type: ActivityTypes.Message,
            text: "Cancelled.",
          });
        } catch {
          // ignore
        }
      }

      const response = await this.agent.processMessage({ from, text, timestamp: new Date() });
      try {
        await this.sendLongMessage(context, response);
      } catch (error) {
        logger.error("Failed to send Teams message", error);
      }
      return;
    }

    const prev = this.activeRequests.get(from);
    if (prev) {
      this.cleanupRequest(from);
      if (prev.activityId) {
        try {
          await context.updateActivity({
            id: prev.activityId,
            type: ActivityTypes.Message,
            text: "Cancelled (new request received).",
          });
        } catch {
          // ignore
        }
      }
    }

    const active: ActiveRequest = {
      heartbeatInterval: null,
      activityId: null,
      aborted: false,
    };
    this.activeRequests.set(from, active);

    let lastEditText = "";
    const taskStartTime = Date.now();

    try {
      const reply = await context.sendActivity("Working on your request...");
      active.activityId = reply?.id || null;
      lastEditText = "Working on your request...";
    } catch (error) {
      logger.debug(`Failed to send initial message: ${error}`);
    }

    const typingSignaler = new TeamsTypingSignaler(context);

    const pipeline = new BlockReplyPipeline({
      chunking: {
        minChars: 200,
        maxChars: 800,
        breakPreference: "paragraph",
        flushOnParagraph: true,
      },
      typingSignaler,
      onChunk: async (chunk: StreamChunk) => {
        if (active.aborted || !active.activityId) {
          return;
        }
        const preview = truncate(chunk.text, MAX_TEAMS_LENGTH - 50);
        if (preview === lastEditText) {
          return;
        }
        try {
          await context.updateActivity({
            id: active.activityId,
            type: ActivityTypes.Message,
            text: preview,
          });
          lastEditText = preview;
        } catch {
          // ignore
        }
      },
    });

    active.heartbeatInterval = setInterval(async () => {
      if (active.aborted || !active.activityId) {
        return;
      }
      const elapsed = Math.floor((Date.now() - taskStartTime) / 1000);
      const heartbeatMsg = `Still working... (${elapsed}s)`;
      if (heartbeatMsg === lastEditText) {
        return;
      }
      try {
        await context.updateActivity({
          id: active.activityId,
          type: ActivityTypes.Message,
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

      const finalText = truncate(response, MAX_TEAMS_LENGTH);

      try {
        if (active.activityId) {
          if (finalText !== lastEditText) {
            await context.updateActivity({
              id: active.activityId,
              type: ActivityTypes.Message,
              text: finalText,
            });
          }
        } else {
          await this.sendLongMessage(context, response);
        }
      } catch {
        try {
          const fallback = "Task completed, but the output was too long to display.";
          if (active.activityId) {
            await context.updateActivity({
              id: active.activityId,
              type: ActivityTypes.Message,
              text: fallback,
            });
          } else {
            await context.sendActivity(fallback);
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
      if (active.activityId) {
        try {
          await context.updateActivity({
            id: active.activityId,
            type: ActivityTypes.Message,
            text: errMsg,
          });
        } catch {
          // ignore
        }
      }
    }
  }

  private async sendLongMessage(context: TurnContext, text: string): Promise<void> {
    if (text.length <= MAX_TEAMS_LENGTH) {
      await context.sendActivity(text);
      return;
    }
    const parts = splitMessage(text, MAX_TEAMS_LENGTH);
    for (const part of parts) {
      await context.sendActivity(part);
    }
  }

  async start() {
    const port = parseInt(process.env.TEAMS_PORT || "3978", 10);

    logger.info("Starting Microsoft Teams bot...");

    const server = http.createServer(async (req, res) => {
      if (req.url === "/api/messages" && req.method === "POST") {
        const adaptedReq = await (adaptRequest(req) as unknown as Promise<Record<string, unknown>>);
        const adaptedRes = adaptResponse(res);
        await this.adapter.process(
          adaptedReq as never,
          adaptedRes as never,
          async (context) => {
            await this.handleMessage(context);
          },
        );
      } else {
        res.writeHead(200);
        res.end("TxtCode Teams Bot is running.");
      }
    });

    server.listen(port, () => {
      logger.info(`Teams bot listening on port ${port}`);
      logger.info("Ensure your Bot Framework messaging endpoint is set to:");
      logger.info(`  https://<your-domain>/api/messages`);
    });
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
