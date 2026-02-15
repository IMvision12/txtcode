import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  WAMessage,
  proto
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import chalk from 'chalk';
import { AgentCore } from '../core/agent';
import { Boom } from '@hapi/boom';

export class WhatsAppBot {
  private agent: AgentCore;
  private sock: any;
  private lastProcessedTimestamp: number = 0;

  constructor(agent: AgentCore) {
    this.agent = agent;
  }

  async start() {
    console.log(chalk.cyan('Initializing WhatsApp client...\n'));

    // Use multi-file auth state (stores session in .wacli_auth folder)
    const { state, saveCreds } = await useMultiFileAuthState('.wacli_auth');

    // Create socket connection
    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    this.sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(chalk.yellow('\n📱 Scan this QR code with WhatsApp:\n'));
        qrcode.generate(qr, { small: true });
        console.log(chalk.gray('\nOpen WhatsApp → Settings → Linked Devices → Link a Device\n'));
      }

      if (connection === 'open') {
        console.log(chalk.green('\n✅ WhatsApp connected!\n'));
        console.log(chalk.cyan('Waiting for messages...\n'));
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          console.log(chalk.yellow('Connection closed. Reconnecting...'));
          await this.start();
        } else {
          console.log(chalk.red('\n❌ WhatsApp logged out. Run agentcode start again.\n'));
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
          
          const text = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text || '';

          if (!text) continue;

          if (!isFromMe) {
            console.log(chalk.gray(`⏭️ Ignoring message from: ${from}`));
            continue;
          }

          if (messageTimestamp <= this.lastProcessedTimestamp) {
            continue;
          }

          this.lastProcessedTimestamp = messageTimestamp;

          console.log(chalk.blue(`📨 Your message: ${text.substring(0, 100)}...`));

          const response = await this.agent.processMessage({
            from,
            text,
            timestamp: new Date(messageTimestamp * 1000)
          });

          if (!response.startsWith('🚫')) {
            await this.sock.sendMessage(from, { text: response });
            console.log(chalk.green(`✅ Replied: ${response.substring(0, 50)}...`));
          }
        } catch (error) {
          console.error(chalk.red('Error processing message:'), error);
        }
      }
    });
  }
}
