import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import chalk from 'chalk';
import { AgentCore } from '../core/agent';

export class WhatsAppBot {
  private client: Client;
  private agent: AgentCore;

  constructor(agent: AgentCore) {
    this.agent = agent;
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox']
      }
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    this.client.on('qr', (qr) => {
      console.log(chalk.yellow('\n📱 Scan this QR code with WhatsApp:\n'));
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log(chalk.green('\n✅ WhatsApp connected!\n'));
      console.log(chalk.cyan('Waiting for messages...\n'));
    });

    this.client.on('message', async (msg) => {
      const from = msg.from;
      const text = msg.body;

      console.log(chalk.blue(`📨 Message from ${from}: ${text}`));

      const response = await this.agent.processMessage({
        from,
        text,
        timestamp: new Date()
      });

      await msg.reply(response);
      console.log(chalk.green(`✅ Replied: ${response.substring(0, 50)}...`));
    });

    this.client.on('disconnected', (reason) => {
      console.log(chalk.red(`\n❌ WhatsApp disconnected: ${reason}`));
    });
  }

  async start() {
    console.log(chalk.cyan('Initializing WhatsApp client...\n'));
    await this.client.initialize();
  }
}
