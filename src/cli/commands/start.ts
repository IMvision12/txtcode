import chalk from "chalk";
import { AgentCore } from "../../core/agent";
import { DiscordBot } from "../../platforms/discord";
import { TelegramBot } from "../../platforms/telegram";
import { WhatsAppBot } from "../../platforms/whatsapp";
import { logger } from "../../shared/logger";
import { getApiKey, getBotToken } from "../../utils/keychain";
import { centerLog } from "../tui";
import { loadConfig } from "./auth";

export async function startCommand(options: { daemon?: boolean }) {
  const config = loadConfig();

  if (!config) {
    console.log();
    centerLog(chalk.yellow("⚠️  TxtCode is not configured yet."));
    console.log();
    centerLog(chalk.white("Please run authentication to get started."));
    console.log();
    process.exit(1);
  }

  logger.info(chalk.blue.bold("\nStarting TxtCode Agent\n"));
  logger.info(chalk.cyan(`Platform: ${config.platform}`));
  logger.info(chalk.cyan(`IDE: ${config.ideType}\n`));

  // Retrieve API key from keychain
  const apiKey = await getApiKey(config.aiProvider);
  if (!apiKey) {
    console.log();
    centerLog(chalk.red("[ERROR] Failed to retrieve API key from keychain"));
    console.log();
    centerLog(chalk.yellow("Please run authentication"));
    console.log();
    process.exit(1);
  }

  // Retrieve bot tokens from keychain if needed
  let telegramToken = "";
  let discordToken = "";

  if (config.platform === "telegram") {
    telegramToken = (await getBotToken("telegram")) || "";
    if (!telegramToken) {
      console.log();
      centerLog(chalk.red("[ERROR] Failed to retrieve Telegram token from keychain"));
      console.log();
      centerLog(chalk.yellow("Please run authentication"));
      console.log();
      process.exit(1);
    }
  } else if (config.platform === "discord") {
    discordToken = (await getBotToken("discord")) || "";
    if (!discordToken) {
      console.log();
      centerLog(chalk.red("[ERROR] Failed to retrieve Discord token from keychain"));
      console.log();
      centerLog(chalk.yellow("Please run authentication"));
      console.log();
      process.exit(1);
    }
  }

  process.env.PLATFORM = config.platform;
  process.env.TELEGRAM_BOT_TOKEN = telegramToken;
  process.env.DISCORD_BOT_TOKEN = discordToken;
  process.env.IDE_TYPE = config.ideType;
  process.env.IDE_PORT = config.idePort;
  process.env.AI_API_KEY = apiKey;
  process.env.AI_PROVIDER = config.aiProvider;
  process.env.AI_MODEL = config.aiModel;
  process.env.PROJECT_PATH = config.projectPath || process.cwd();
  process.env.OLLAMA_MODEL = config.ollamaModel || "gpt-oss:20b";
  process.env.CLAUDE_MODEL = config.claudeModel || "sonnet";
  process.env.GEMINI_MODEL = config.geminiModel || "";

  const agent = new AgentCore();

  try {
    if (config.platform === "whatsapp") {
      const bot = new WhatsAppBot(agent);
      await bot.start();
    } else if (config.platform === "telegram") {
      const bot = new TelegramBot(agent);
      await bot.start();
    } else if (config.platform === "discord") {
      const bot = new DiscordBot(agent);
      await bot.start();
    } else {
      logger.error("Invalid platform specified");
      process.exit(1);
    }
  } catch (error) {
    logger.error("Failed to start agent", error);
    process.exit(1);
  }
}
