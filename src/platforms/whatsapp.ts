import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  WAMessage,
  proto
} from '@whiskeysockets/baileys';
import chalk from 'chalk';
import { AgentCore } from '../core/agent';
import { Boom } from '@hapi/boom';
import fs from 'fs';

export class WhatsAppBot {
  private agent: AgentCore;
  private sock: any;
  private lastProcessedTimestamp: number = 0;
  private authorizedNumber: string;

  constructor(agent: AgentCore) {
    this.agent = agent;
    this.authorizedNumber = process.env.AUTHORIZED_USER_ID || '';
  }

  async start() {
    console.log(chalk.cyan('Starting WhatsApp bot...\n'));

    if (!fs.existsSync('.wacli_auth')) {
      console.log(chalk.red('\n[ERROR] WhatsApp not authenticated!'));
      console.log(chalk.yellow('Please run: ' + chalk.bold('txtcode auth') + ' first\n'));
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
        console.log(chalk.green('\n[OK] WhatsApp connected!\n'));
        console.log(chalk.cyan(`Authorized number: ${this.authorizedNumber}`));
        console.log(chalk.cyan('Waiting for messages...\n'));
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          console.log(chalk.yellow('Connection closed. Reconnecting...'));
          await this.start();
        } else {
          console.log(chalk.red('\n[ERROR] WhatsApp logged out. Run ' + chalk.bold('txtcode auth') + ' again.\n'));
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
          
          if (from.endsWith('@g.us')) {
            console.log(chalk.gray(`[SKIP] Ignoring group message from: ${from}`));
            continue;
          }

          if (!isFromMe) {
            console.log(chalk.gray(`[SKIP] Ignoring message from others (not from self)`));
            continue;
          }

          if (from.endsWith('@lid')) {
            console.log(chalk.cyan(`[DEBUG] Self-message via LID: ${from}, isFromMe: ${isFromMe}`));
          } else {
            let senderNumber = from.split('@')[0];
            
            if (senderNumber.includes(':')) {
              senderNumber = senderNumber.split(':')[0];
            }
            
            console.log(chalk.cyan(`[DEBUG] Raw JID: ${from}, Extracted number: ${senderNumber}, Authorized: ${this.authorizedNumber}, isFromMe: ${isFromMe}`));
            
            if (senderNumber !== this.authorizedNumber) {
              console.log(chalk.yellow(`[BLOCKED] Unauthorized number: ${senderNumber} (expected: ${this.authorizedNumber})`));
              continue;
            }
          }

          const text = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text || '';

          if (!text) continue;

          if (messageTimestamp <= this.lastProcessedTimestamp) {
            continue;
          }

          this.lastProcessedTimestamp = messageTimestamp;

          console.log(chalk.blue(`[MSG] Authorized message: ${text.substring(0, 100)}...`));

          const response = await this.agent.processMessage({
            from,
            text,
            timestamp: new Date(messageTimestamp * 1000)
          });

          await this.sock.sendMessage(from, { text: response });
          console.log(chalk.green(`[OK] Replied: ${response.substring(0, 50)}...`));
        } catch (error) {
          console.error(chalk.red('Error processing message:'), error);
        }
      }
    });
  }
}
