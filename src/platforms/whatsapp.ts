import fs from "fs";
import os from "os";
import path from "path";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WAMessage,
  proto,
} from "@whiskeysockets/baileys";
import { AgentCore } from "../core/agent";
import { logger } from "../shared/logger";
import { BlockReplyPipeline } from "../shared/block-reply-pipeline";
import { WhatsAppTypingSignaler } from "../shared/typing-signaler";
import type { StreamChunk } from "../shared/streaming-types";

const WA_AUTH_DIR = path.join(os.homedir(), ".txtcode", ".wacli_auth");

export class WhatsAppBot {
  private agent: AgentCore;
  private sock: any;
  private lastProcessedTimestamp: number = 0;

  constructor(agent: AgentCore) {
    this.agent = agent;
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
      logger: {
        level: "silent",
        fatal: () => {},
        error: () => {},
        warn: () => {},
        info: () => {},
        debug: () => {},
        trace: () => {},
        child: () => ({
          level: "silent",
          fatal: () => {},
          error: () => {},
          warn: () => {},
          info: () => {},
          debug: () => {},
          trace: () => {},
        }),
      } as any,
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
                timestamp: new Date(messageTimestamp * 1000),
              });
              await this.sock.sendMessage(from, { text: response }, { quoted: msg });
              logger.debug(`Replied: ${response}`);
              continue;
            }

            // CODE mode - use streaming with block reply pipeline
            let taskStartTime = Date.now();
            let heartbeatInterval: NodeJS.Timeout | null = null;

            // Send initial "working" message immediately
            try {
              await this.sock.sendMessage(
                from,
                { text: `⏳ Working on your request...` },
                { quoted: msg },
              );
              logger.debug(`[PROGRESS] Sent initial working message`);
            } catch (error) {
              logger.debug(`Failed to send initial message: ${error}`);
            }

            // Create typing signaler
            const typingSignaler = new WhatsAppTypingSignaler(this.sock, from);

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
                  await this.sock.sendMessage(from, {
                    text: `${prefix}\n\`\`\`\n${chunk.text}\n\`\`\``,
                  });
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
                await this.sock.sendMessage(from, {
                  text: `⏳ Still working... (${elapsed}s elapsed)`,
                });
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
                  timestamp: new Date(messageTimestamp * 1000),
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

              await this.sock.sendMessage(from, { text: response }, { quoted: msg });
              logger.debug(`Replied: ${response}`);
            } catch (error) {
              // Clear heartbeat on error
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
              }
              await typingSignaler.stopTyping();
              throw error;
            }
          } catch (error) {
            logger.error("Error processing message", error);
          }
        }
      },
    );
  }
}
