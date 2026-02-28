import fs from "fs";
import os from "os";
import path from "path";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  type ConnectionState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type WASocket,
  WAMessage,
} from "@whiskeysockets/baileys";
import { AgentCore } from "../core/agent";
import { logger } from "../shared/logger";
import { WhatsAppTypingSignaler } from "../shared/typing-signaler";

const WA_AUTH_DIR = path.join(os.homedir(), ".txtcode", ".wacli_auth");
const MAX_WA_LENGTH = 4096;
const MAX_RECONNECT_ATTEMPTS = 12;
const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 30000;
const RECONNECT_FACTOR = 1.8;

const noop = () => {};
const silentLogger = {
  level: "silent" as const,
  fatal: noop,
  error: noop,
  warn: noop,
  info: noop,
  debug: noop,
  trace: noop,
  child: () => silentLogger,
} as unknown as Parameters<typeof makeWASocket>[0]["logger"];

interface ActiveRequest {
  heartbeatInterval: NodeJS.Timeout | null;
  aborted: boolean;
}

function computeBackoff(attempt: number): number {
  const delay = Math.min(RECONNECT_BASE_MS * Math.pow(RECONNECT_FACTOR, attempt), RECONNECT_MAX_MS);
  const jitter = delay * 0.25 * Math.random();
  return delay + jitter;
}

// Serialized credential save queue (prevents concurrent writes racing on Windows)
function createCredsSaver(saveCreds: () => Promise<void>): () => void {
  let queue: Promise<void> = Promise.resolve();
  return () => {
    queue = queue.then(() => saveCreds()).catch(() => {});
  };
}

export class WhatsAppBot {
  private agent: AgentCore;
  private sock!: WASocket;
  private lastProcessedTimestamp: number = 0;
  private activeRequests: Map<string, ActiveRequest> = new Map();
  private reconnectAttempts = 0;
  private connectedAt = 0;

  constructor(agent: AgentCore) {
    this.agent = agent;
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

  async start() {
    logger.info("Starting WhatsApp bot...");

    if (!fs.existsSync(WA_AUTH_DIR)) {
      logger.error("WhatsApp not authenticated! Run: txtcode auth");
      process.exit(1);
    }

    const { state, saveCreds } = await useMultiFileAuthState(WA_AUTH_DIR);
    const enqueueSaveCreds = createCredsSaver(saveCreds);

    const { version } = await fetchLatestBaileysVersion().catch(() => ({
      version: undefined as unknown as [number, number, number],
    }));

    this.sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
      },
      version,
      printQRInTerminal: false,
      browser: ["TxtCode", "CLI", "1.0.0"],
      syncFullHistory: false,
      markOnlineOnConnect: false,
      logger: silentLogger,
    });

    // Handle WebSocket errors to prevent unhandled crashes
    if (this.sock.ws && typeof (this.sock.ws as { on?: Function }).on === "function") {
      (this.sock.ws as { on: Function }).on("error", (err: Error) => {
        logger.error("WebSocket error:", err.message);
      });
    }

    this.sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect } = update;

      if (connection === "open") {
        logger.info("WhatsApp connected!");
        logger.info("Waiting for messages...");
        this.connectedAt = Date.now();
        this.reconnectAttempts = 0;
        this.sock.sendPresenceUpdate("available").catch(() => {});
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (!shouldReconnect) {
          logger.error("WhatsApp logged out. Run txtcode auth again.");
          process.exit(1);
        }

        // Reset backoff if connection was healthy for > 60s
        if (this.connectedAt && Date.now() - this.connectedAt > 60000) {
          this.reconnectAttempts = 0;
        }

        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          logger.error(`Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Exiting.`);
          process.exit(1);
        }

        const delay = computeBackoff(this.reconnectAttempts);
        this.reconnectAttempts++;
        logger.error(`Connection closed (code: ${statusCode}). Reconnecting in ${Math.round(delay / 1000)}s...`);
        await new Promise((r) => setTimeout(r, delay));
        await this.start();
      }
    });

    this.sock.ev.on("creds.update", enqueueSaveCreds);

    this.sock.ev.on(
      "messages.upsert",
      async ({ messages, type }: { messages: WAMessage[]; type: string }) => {
        for (const msg of messages) {
          try {
            if (type !== "notify") {
              continue;
            }
            if (!msg.message || msg.key.remoteJid === "status@broadcast") {
              continue;
            }

            const from = msg.key.remoteJid || "";
            const isFromMe = msg.key.fromMe || false;
            const messageTimestamp = (msg.messageTimestamp as number) || 0;

            if (!isFromMe) {
              continue;
            }
            if (from.endsWith("@g.us")) {
              continue;
            }

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            if (!text) {
              continue;
            }
            if (messageTimestamp <= this.lastProcessedTimestamp) {
              continue;
            }

            this.lastProcessedTimestamp = messageTimestamp;
            logger.debug(`Incoming message: ${text}`);

            if (!this.agent.shouldStream(from, text)) {
              this.cleanupRequest(from);

              const response = await this.agent.processMessage({
                from,
                text,
                timestamp: new Date(messageTimestamp * 1000),
              });
              await this.sendLongMessage(from, response, msg);
              continue;
            }

            const prev = this.activeRequests.get(from);
            if (prev) {
              this.cleanupRequest(from);
              await this.sock.sendMessage(from, {
                text: "Previous command cancelled.",
              });
            }

            const active: ActiveRequest = {
              heartbeatInterval: null,
              aborted: false,
            };
            this.activeRequests.set(from, active);

            const typingSignaler = new WhatsAppTypingSignaler(this.sock, from);

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
                  timestamp: new Date(messageTimestamp * 1000),
                },
                async (_chunk: string) => {
                  if (!active.aborted) {
                    await typingSignaler.signalTyping();
                  }
                },
              );

              if (active.aborted) {
                continue;
              }

              if (active.heartbeatInterval) {
                clearInterval(active.heartbeatInterval);
              }
              this.activeRequests.delete(from);
              await typingSignaler.stopTyping();

              await this.sendLongMessage(from, response, msg);
            } catch (error) {
              if (active.aborted) {
                continue;
              }

              if (active.heartbeatInterval) {
                clearInterval(active.heartbeatInterval);
              }
              this.activeRequests.delete(from);
              await typingSignaler.stopTyping();

              const isAbort = error instanceof Error && error.message.includes("aborted");
              if (isAbort) {
                continue;
              }

              const errMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
              await this.sock.sendMessage(from, { text: errMsg }, { quoted: msg });
            }
          } catch (error) {
            logger.error("Error processing message", error);
          }
        }
      },
    );
  }

  private async sendLongMessage(jid: string, text: string, quotedMsg: WAMessage): Promise<void> {
    if (text.length <= MAX_WA_LENGTH) {
      await this.sock.sendMessage(jid, { text }, { quoted: quotedMsg });
      return;
    }
    const parts = splitMessage(text, MAX_WA_LENGTH);
    for (let i = 0; i < parts.length; i++) {
      if (i === 0) {
        await this.sock.sendMessage(jid, { text: parts[i] }, { quoted: quotedMsg });
      } else {
        await this.sock.sendMessage(jid, { text: parts[i] });
      }
    }
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
