import { Client, GatewayIntentBits, Message, Partials } from 'discord.js';
import chalk from 'chalk';
import { AgentCore } from '../core/agent';

export class DiscordBot {
  private client: Client;
  private agent: AgentCore;

  constructor(agent: AgentCore) {
    this.agent = agent;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping,
      ],
      partials: [
        Partials.Channel, // Required for DMs
        Partials.Message,
      ],
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    this.client.once('ready', () => {
      console.log(chalk.green(`\n✅ Discord bot logged in as ${this.client.user?.tag}!\n`));
      console.log(chalk.cyan('Waiting for messages...\n'));
    });

    this.client.on('messageCreate', async (message: Message) => {
      // Ignore bot's own messages
      if (message.author.bot) return;

      // Ignore messages that don't mention the bot (in servers)
      // In DMs, respond to all messages
      if (message.guild && !message.mentions.has(this.client.user!)) return;

      const from = message.author.id;
      const text = message.content
        .replace(`<@${this.client.user?.id}>`, '') // Remove bot mention
        .trim();

      if (!text) return;

      console.log(chalk.blue(`📨 Message from ${message.author.tag}: ${text}`));

      // Show typing indicator
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      const response = await this.agent.processMessage({
        from,
        text,
        timestamp: new Date(),
      });

      // Only send reply if user is authorized
      if (!response.startsWith('🚫')) {
        await message.reply(response);
        console.log(chalk.green(`✅ Replied: ${response.substring(0, 50)}...`));
      } else {
        console.log(chalk.yellow(`⚠️ Ignored unauthorized user: ${from}`));
      }
    });

    this.client.on('error', (error) => {
      console.error(chalk.red('Discord client error:'), error);
    });
  }

  async start() {
    const token = process.env.DISCORD_BOT_TOKEN;

    if (!token) {
      throw new Error('DISCORD_BOT_TOKEN not set in config');
    }

    console.log(chalk.cyan('Connecting to Discord...\n'));
    await this.client.login(token);
  }
}
