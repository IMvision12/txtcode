import chalk from 'chalk';
import { WhatsAppBot } from '../../msg-platform/whatsapp';
import { TelegramBot } from '../../msg-platform/telegram';
import { DiscordBot } from '../../msg-platform/discord';
import { AgentCore } from '../../lib/agent';
import { loadConfig } from './auth';

export async function agentCommand(options: { daemon?: boolean }) {
  const config = loadConfig();

  if (!config) {
    console.log(chalk.yellow('\n⚠️  AgentCode is not configured yet.\n'));
    console.log(chalk.white('Please run: ' + chalk.bold.cyan('agentcode auth') + ' to get started.\n'));
    process.exit(1);
  }

  console.log(chalk.blue.bold('\n🤖 Starting AgentCode Agent\n'));
  console.log(chalk.cyan(`Platform: ${config.platform}`));
  console.log(chalk.cyan(`IDE: ${config.ideType}\n`));

  // Set environment variables from config
  process.env.PLATFORM = config.platform;
  process.env.TELEGRAM_BOT_TOKEN = config.telegramToken;
  process.env.DISCORD_BOT_TOKEN = config.discordToken;
  process.env.AUTHORIZED_USER_ID = config.authorizedUserId;
  process.env.IDE_TYPE = config.ideType;
  process.env.IDE_PORT = config.idePort;
  process.env.AI_API_KEY = config.aiApiKey;
  process.env.AI_PROVIDER = config.aiProvider;
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
      console.error(chalk.red('Invalid platform specified'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Failed to start agent:'), error);
    process.exit(1);
  }
}
