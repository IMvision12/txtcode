import { Telegraf } from 'telegraf';
import chalk from 'chalk';
import { AgentCore } from '../core/agent';

export class TelegramBot {
  private bot: Telegraf;
  private agent: AgentCore;

  constructor(agent: AgentCore) {
    this.agent = agent;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not set in .env');
    }

    this.bot = new Telegraf(token);
    this.setupHandlers();
  }

  private setupHandlers() {
    this.bot.start((ctx) => {
      ctx.reply('Welcome to AgentCode! Send me coding instructions.');
    });

    this.bot.on('text', async (ctx) => {
      const from = ctx.from.id.toString();
      const text = ctx.message.text;

      console.log(chalk.blue(`[MSG] Message from ${from}: ${text}`));

      const response = await this.agent.processMessage({
        from,
        text,
        timestamp: new Date()
      });

      await ctx.reply(response);
      console.log(chalk.green(`[OK] Replied`));
    });
  }

  async start() {
    console.log(chalk.cyan('Starting Telegram bot...\n'));
    await this.bot.launch();
    console.log(chalk.green('[OK] Telegram bot is running!\n'));

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}
