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
      printQRInTerminal: false, // We'll handle QR display ourselves
    });

    // Handle connection updates
    this.sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      // Display QR code
      if (qr) {
        console.log(chalk.yellow('\n📱 Scan this QR code with WhatsApp:\n'));
        qrcode.generate(qr, { small: true });
        console.log(chalk.gray('\nOpen WhatsApp → Settings → Linked Devices → Link a Device\n'));
      }

      // Connection established
      if (connection === 'open') {
        console.log(chalk.green('\n✅ WhatsApp connected!\n'));
        console.log(chalk.cyan('Waiting for messages...\n'));
      }

      // Handle disconnection
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          console.log(chalk.yellow('Connection closed. Reconnecting...'));
          await this.start();
        } else {
          console.log(chalk.red('\n❌ WhatsApp logged out. Run opencode start again.\n'));
        }
      }
    });

    // Save credentials whenever they update
    this.sock.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    this.sock.ev.on('messages.upsert', async ({ messages }: { messages: WAMessage[] }) => {
      for (const msg of messages) {
        // Ignore if not a text message or from status
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

        const from = msg.key.remoteJid || '';
        const text = msg.message.conversation || 
                     msg.message.extendedTextMessage?.text || '';

        if (!text) continue;

        // Ignore bot's own responses (messages starting with [Gemini], [OpenAI], [Anthropic])
        if (text.startsWith('[Gemini]') || text.startsWith('[OpenAI]') || text.startsWith('[Anthropic]')) {
          continue;
        }

        console.log(chalk.blue(`📨 Message from ${from}: ${text}`));

        const response = await this.agent.processMessage({
          from,
          text,
          timestamp: new Date()
        });

        // Only send reply if user is authorized (response won't start with 🚫)
        if (!response.startsWith('🚫')) {
          await this.sock.sendMessage(from, { text: response });
          console.log(chalk.green(`✅ Replied: ${response.substring(0, 50)}...`));
        } else {
          console.log(chalk.yellow(`⚠️ Ignored unauthorized user: ${from}`));
        }
      }
    });
  }
}
