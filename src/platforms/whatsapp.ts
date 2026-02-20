import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  WAMessage,
  proto
} from '@whiskeysockets/baileys';
import { AgentCore } from '../core/agent';
import { Boom } from '@hapi/boom';
import { logger } from '../shared/logger';
import fs from 'fs';

export class WhatsAppBot {
  private agent: AgentCore;
  private sock: any;
  private lastProcessedTimestamp: number = 0;

  constructor(agent: AgentCore) {
    this.agent = agent;
  }

  async start() {
    logger.info('Starting WhatsApp bot...');

    if (!fs.existsSync('.wacli_auth')) {
      logger.error('WhatsApp not authenticated! Run: txtcode auth');
      process.exit(1);
    }

    const { state, saveCreds } = await useMultiFileAuthState('.wacli_auth');

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: {
        level: 'silent',
        fatal: () => {},
        error: () => {},
        warn: () => {},
        info: () => {},
        debug: () => {},
        trace: () => {},
        child: () => ({
          level: 'silent',
          fatal: () => {},
          error: () => {},
          warn: () => {},
          info: () => {},
          debug: () => {},
          trace: () => {},
        }),
      } as any,
    });

    this.sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        logger.info('WhatsApp connected!');
        logger.info('Waiting for messages...');
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          logger.error('Connection closed. Reconnecting...');
          await this.start();
        } else {
          logger.error('WhatsApp logged out. Run txtcode auth again.');
          process.exit(1);
        }
      }
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('messages.upsert', async ({ messages, type }: { messages: WAMessage[], type: string }) => {
      for (const msg of messages) {
        try {
          if (type !== 'notify') continue;

          if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

          const from = msg.key.remoteJid || '';
          const isFromMe = msg.key.fromMe || false;
          const messageTimestamp = (msg.messageTimestamp as number) || 0;
          
          if (!isFromMe) continue;

          if (from.endsWith('@g.us')) continue;

          const text = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text || '';

          if (!text) continue;

          if (messageTimestamp <= this.lastProcessedTimestamp) {
            continue;
          }

          this.lastProcessedTimestamp = messageTimestamp;

          logger.debug(`Incoming message: ${text}`);

          const response = await this.agent.processMessage({
            from,
            text,
            timestamp: new Date(messageTimestamp * 1000)
          });

          await this.sock.sendMessage(from, { text: response }, { quoted: msg });
          logger.debug(`Replied: ${response}`);
        } catch (error) {
          logger.error('Error processing message', error);
        }
      }
    });
  }
}
