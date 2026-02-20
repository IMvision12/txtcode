import { Client, GatewayIntentBits, Message, Partials } from 'discord.js';
import { AgentCore } from '../core/agent';
import { logger } from '../shared/logger';

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
      logger.info(`Discord bot logged in as ${this.client.user?.tag}!`);
      logger.info('Waiting for messages...');
    });

    this.client.on('messageCreate', async (message: Message) => {
      if (message.author.bot) return;

      if (message.guild && !message.mentions.has(this.client.user!)) return;

      const from = message.author.id;
      const text = message.content
        .replace(`<@${this.client.user?.id}>`, '')
        .trim();

      if (!text) return;

      logger.debug(`Incoming message from ${message.author.tag}: ${text}`);

      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      const response = await this.agent.processMessage({
        from,
        text,
        timestamp: new Date(),
      });

      try {
        await message.reply(response);
        logger.debug(`Replied: ${response}`);
      } catch (error: any) {
        logger.error('Failed to send Discord message', error);
        try {
          await message.reply('[OK] Task completed, but output was too long to display.');
        } catch (fallbackError) {
          logger.error('Failed to send fallback message', fallbackError);
        }
      }
    });

    this.client.on('error', (error) => {
      logger.error('Discord client error', error);
    });
  }

  async start() {
    const token = process.env.DISCORD_BOT_TOKEN;

    if (!token) {
      throw new Error('DISCORD_BOT_TOKEN not set in config');
    }

    logger.info('Connecting to Discord...');
    await this.client.login(token);
  }
}
