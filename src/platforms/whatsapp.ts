import fs from "fs";
import os from "os";
import path from "path";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WAMessage,
} from "@whiskeysockets/baileys";
import { AgentCore } from "../core/agent";
import { logger } from "../shared/logger";
import { WhatsAppTypingSignaler } from "../shared/typing-signaler";

const WA_AUTH_DIR = path.join(os.homedir(), ".txtcode", ".wacli_auth");
const MAX_WA_LENGTH = 4096;

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
} as any;

interface ActiveRequest {
  heartbeatInterval: NodeJS.Timeout | null;
  aborted: boolean;
}

export class WhatsAppBot {
  private agent: AgentCore;
  private sock: any;
  private lastProcessedTimestamp: number = 0;
  private activeRequests: Map<string, ActiveRequest> = new Map();

  constructor(agent: AgentCore) {
    this.agent = agent;
  }

  private cleanupRequest(userId: string) {
    const active = this.activeRequests.get(userId);
    if (!active) return;
    active.aborted = true;
    if (active.heartbeatInterval) clearInterval(active.heartbeatInterval);
    this.activeRequests.delete(userId);
  }

  async start() {
    logger.info("Starting WhatsApp bot...");

    if (!fs.existsSync(WA_AUTH_DIR)) {
      logger.error("WhatsApp not authenticated! Run: txtcode auth");
      process.exit(1);
    }

    const { state, saveCreds } = await useMultiFileAuthState(WA_AUTH_DIR);

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: silentLogger,
    });

    this.sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect } = update;

      if (connection === "open") {
        logger.info("WhatsApp connected!");
        logger.info("Waiting for messages...");
      }

      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          logger.error("Connection closed. Reconnecting...");
          await this.start();
        } else {
          logger.error("WhatsApp logged out. Run txtcode auth again.");
          process.exit(1);
        }
      }
    });

    this.sock.ev.on("creds.update", saveCreds);

    this.sock.ev.on(
      "messages.upsert",
      async ({ messages, type }: { messages: WAMessage[]; type: string }) => {
        for (const msg of messages) {
          try {
            if (type !== "notify") continue;
            if (!msg.message || msg.key.remoteJid === "status@broadcast") continue;

            const from = msg.key.remoteJid || "";
            const isFromMe = msg.key.fromMe || false;
            const messageTimestamp = (msg.messageTimestamp as number) || 0;

            if (!isFromMe) continue;
            if (from.endsWith("@g.us")) continue;

            const text =
              msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            if (!text) continue;
            if (messageTimestamp <= this.lastProcessedTimestamp) continue;

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

            // New code request: cancel previous in-flight request
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
              if (active.aborted) return;
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
                  if (!active.aborted) await typingSignaler.signalTyping();
                },
              );

              if (active.aborted) continue;

              if (active.heartbeatInterval) clearInterval(active.heartbeatInterval);
              this.activeRequests.delete(from);
              await typingSignaler.stopTyping();

              await this.sendLongMessage(from, response, msg);
            } catch (error) {
              if (active.aborted) continue;

              if (active.heartbeatInterval) clearInterval(active.heartbeatInterval);
              this.activeRequests.delete(from);
              await typingSignaler.stopTyping();

              const isAbort = error instanceof Error && error.message.includes("aborted");
              if (isAbort) continue;

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

  private async sendLongMessage(
    jid: string,
    text: string,
    quotedMsg: WAMessage,
  ): Promise<void> {
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
    if (breakAt < max / 2) breakAt = max;
    parts.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt);
  }
  return parts;
}
