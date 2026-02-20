import chalk from 'chalk';
import { WhatsAppBot } from '../../platforms/whatsapp';
import { TelegramBot } from '../../platforms/telegram';
import { DiscordBot } from '../../platforms/discord';
import { AgentCore } from '../../core/agent';
import { loadConfig } from './auth';
import { logger } from '../../shared/logger';

export async function startCommand(options: { daemon?: boolean }) {
  const config = loadConfig();

  if (!config) {
    console.log(chalk.yellow('\n⚠️  TxtCode is not configured yet.\n'));
    console.log(chalk.white('Please run: ' + chalk.bold.cyan('txtcode auth') + ' to get started.\n'));
    process.exit(1);
  }

  logger.info(chalk.blue.bold('\nStarting TxtCode Agent\n'));
  logger.info(chalk.cyan(`Platform: ${config.platform}`));
  logger.info(chalk.cyan(`IDE: ${config.ideType}\n`));

  process.env.PLATFORM = config.platform;
  process.env.TELEGRAM_BOT_TOKEN = config.telegramToken;
  process.env.DISCORD_BOT_TOKEN = config.discordToken;
  process.env.AUTHORIZED_USER_ID = config.authorizedUserId;
  process.env.IDE_TYPE = config.ideType;
  process.env.IDE_PORT = config.idePort;
  process.env.AI_API_KEY = config.aiApiKey;
  process.env.AI_PROVIDER = config.aiProvider;
  process.env.AI_MODEL = config.aiModel;
  process.env.PROJECT_PATH = config.projectPath || process.cwd();
  process.env.OLLAMA_MODEL = config.ollamaModel || 'gpt-oss:20b';
  process.env.CLAUDE_MODEL = config.claudeModel || 'sonnet';
  process.env.GEMINI_MODEL = config.geminiModel || '';

  const agent = new AgentCore();

  try {
    if (config.platform === 'whatsapp') {
      const bot = new WhatsAppBot(agent);
      await bot.start();
    } else if (config.platform === 'telegram') {
      const bot = new TelegramBot(agent);
      await bot.start();
    } else if (config.platform === 'discord') {
      const bot = new DiscordBot(agent);
      await bot.start();
    } else {
      logger.error('Invalid platform specified');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Failed to start agent', error);
    process.exit(1);
  }
}
