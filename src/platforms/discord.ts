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
        Partials.Channel,
        Partials.Message,
      ],
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    this.client.once('ready', () => {
      console.log(chalk.green(`\n[OK] Discord bot logged in as ${this.client.user?.tag}!\n`));
      console.log(chalk.cyan('Waiting for messages...\n'));
    });

    this.client.on('messageCreate', async (message: Message) => {
      if (message.author.bot) return;

      if (message.guild && !message.mentions.has(this.client.user!)) return;

      const from = message.author.id;
      const text = message.content
        .replace(`<@${this.client.user?.id}>`, '')
        .trim();

      if (!text) return;

      console.log(chalk.blue(`[MSG] Message from ${message.author.tag}: ${text}`));

      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      const response = await this.agent.processMessage({
        from,
        text,
        timestamp: new Date(),
      });

      try {
        const maxLength = 1900;
        const truncatedResponse = response.length > maxLength 
          ? response.substring(0, maxLength) + '\n\n... (output truncated)'
          : response;
        
        await message.reply(truncatedResponse);
        console.log(chalk.green(`[OK] Replied: ${truncatedResponse.substring(0, 50)}...`));
      } catch (error: any) {
        console.error(chalk.red('Failed to send Discord message:'), error);
        try {
          await message.reply('[OK] Task completed, but output was too long to display.');
        } catch (fallbackError) {
          console.error(chalk.red('Failed to send fallback message:'), fallbackError);
        }
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
