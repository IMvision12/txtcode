import http from "http";
import { AgentCore } from "../core/agent";
import { logger } from "../shared/logger";
import { SignalTypingSignaler } from "../shared/typing-signaler";

const MAX_SIGNAL_LENGTH = 4096;

interface SignalMessage {
  envelope: {
    source: string;
    sourceNumber?: string;
    sourceName?: string;
    timestamp: number;
    dataMessage?: {
      message: string;
      timestamp: number;
    };
  };
}

interface ActiveRequest {
  heartbeatInterval: NodeJS.Timeout | null;
  aborted: boolean;
}

export class SignalBot {
  private agent: AgentCore;
  private signalCliUrl: string;
  private registeredNumber: string;
  private activeRequests: Map<string, ActiveRequest> = new Map();

  constructor(agent: AgentCore) {
    this.agent = agent;
    this.signalCliUrl = process.env.SIGNAL_CLI_REST_URL || "http://localhost:8080";
    this.registeredNumber = process.env.SIGNAL_PHONE_NUMBER || "";

    if (!this.registeredNumber) {
      throw new Error("SIGNAL_PHONE_NUMBER not set in config");
    }
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

  private async sendMessage(recipient: string, message: string): Promise<void> {
    const url = `${this.signalCliUrl}/v2/send`;
    const body = JSON.stringify({
      message,
      number: this.registeredNumber,
      recipients: [recipient],
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!response.ok) {
      throw new Error(`Signal API error: ${response.status} ${response.statusText}`);
    }
  }

  private async sendTypingIndicator(recipient: string): Promise<void> {
    try {
      const url = `${this.signalCliUrl}/v1/typing-indicator/${this.registeredNumber}`;
      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient }),
      });
    } catch {
      // Typing indicator is best-effort
    }
  }

  private async sendLongMessage(recipient: string, text: string): Promise<void> {
    if (text.length <= MAX_SIGNAL_LENGTH) {
      await this.sendMessage(recipient, text);
      return;
    }
    const parts = splitMessage(text, MAX_SIGNAL_LENGTH);
    for (const part of parts) {
      await this.sendMessage(recipient, part);
    }
  }

  private async handleIncomingMessage(signalMsg: SignalMessage) {
    const dataMessage = signalMsg.envelope.dataMessage;
    if (!dataMessage?.message) {
      return;
    }

    const from = signalMsg.envelope.source || signalMsg.envelope.sourceNumber || "";
    const text = dataMessage.message;

    if (!from || !text) {
      return;
    }

    logger.debug(`Incoming Signal message from ${from}: ${text}`);

    if (!this.agent.shouldStream(from, text)) {
      this.cleanupRequest(from);

      const response = await this.agent.processMessage({
        from,
        text,
        timestamp: new Date(dataMessage.timestamp),
      });
      await this.sendLongMessage(from, response);
      return;
    }

    const prev = this.activeRequests.get(from);
    if (prev) {
      this.cleanupRequest(from);
      await this.sendMessage(from, "Previous command cancelled.");
    }

    const active: ActiveRequest = {
      heartbeatInterval: null,
      aborted: false,
    };
    this.activeRequests.set(from, active);

    const typingSignaler = new SignalTypingSignaler(this.signalCliUrl, this.registeredNumber, from);

    active.heartbeatInterval = setInterval(async () => {
      if (active.aborted) {
        return;
      }
      await typingSignaler.signalTyping();
    }, 3000);

    try {
      const response = await this.agent.processMessage(
        {
          from,
          text,
          timestamp: new Date(dataMessage.timestamp),
        },
        async (_chunk: string) => {
          if (!active.aborted) {
            await typingSignaler.signalTyping();
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
      await typingSignaler.stopTyping();

      await this.sendLongMessage(from, response);
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
      await this.sendMessage(from, errMsg);
    }
  }

  async start() {
    const webhookPort = parseInt(process.env.SIGNAL_WEBHOOK_PORT || "3979", 10);

    logger.info("Starting Signal bot...");
    logger.info(`Signal CLI REST API: ${this.signalCliUrl}`);
    logger.info(`Registered number: ${this.registeredNumber}`);

    try {
      const healthCheck = await fetch(`${this.signalCliUrl}/v1/about`);
      if (!healthCheck.ok) {
        throw new Error(`signal-cli-rest-api returned ${healthCheck.status}`);
      }
      logger.info("Connected to signal-cli-rest-api");
    } catch (error) {
      throw new Error(
        `Cannot connect to signal-cli-rest-api at ${this.signalCliUrl}. ` +
          `Make sure signal-cli-rest-api is running. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }

    try {
      await fetch(`${this.signalCliUrl}/v1/receive/${this.registeredNumber}`, {
        method: "GET",
      });
    } catch {}

    const server = http.createServer(async (req, res) => {
      if (req.url === "/api/signal/webhook" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", async () => {
          try {
            const message = JSON.parse(body) as SignalMessage;
            await this.handleIncomingMessage(message);
          } catch (error) {
            logger.error("Failed to process Signal webhook", error);
          }
          res.writeHead(200);
          res.end("OK");
        });
      } else {
        res.writeHead(200);
        res.end("TxtCode Signal Bot is running.");
      }
    });

    server.listen(webhookPort, () => {
      logger.info(`Signal webhook listening on port ${webhookPort}`);
      logger.info("Configure signal-cli-rest-api webhook to:");
      logger.info(`  http://localhost:${webhookPort}/api/signal/webhook`);
    });

    this.startPolling();
  }

  private startPolling() {
    const pollInterval = parseInt(process.env.SIGNAL_POLL_INTERVAL || "2000", 10);

    setInterval(async () => {
      try {
        const url = `${this.signalCliUrl}/v1/receive/${this.registeredNumber}`;
        const response = await fetch(url);
        if (!response.ok) {
          return;
        }

        const messages = (await response.json()) as SignalMessage[];
        for (const msg of messages) {
          try {
            await this.handleIncomingMessage(msg);
          } catch (error) {
            logger.error("Error processing polled Signal message", error);
          }
        }
      } catch {}
    }, pollInterval);
  }
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
