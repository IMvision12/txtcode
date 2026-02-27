import chalk from "chalk";
import { AgentCore } from "../../core/agent";
import { DiscordBot } from "../../platforms/discord";
import { SignalBot } from "../../platforms/signal";
import { SlackBot } from "../../platforms/slack";
import { TeamsBot } from "../../platforms/teams";
import { TelegramBot } from "../../platforms/telegram";
import { WhatsAppBot } from "../../platforms/whatsapp";
import { logger } from "../../shared/logger";
import type { Config, MCPServerEntry } from "../../shared/types";
import { getApiKey, getBotToken } from "../../utils/keychain";
import { loadMCPServersCatalog } from "../../utils/mcp-catalog-loader";
import { centerLog } from "../tui";
import { loadConfig } from "./auth";

async function loadPlatformToken(name: string, keychainKey: string): Promise<string> {
  const token = (await getBotToken(keychainKey)) || "";
  if (!token) {
    console.log();
    centerLog(chalk.red(`[ERROR] Failed to retrieve ${name} token from keychain`));
    console.log();
    centerLog(chalk.yellow("Please run authentication"));
    console.log();
    process.exit(1);
  }
  return token;
}

async function loadMCPTokens(mcpServers: MCPServerEntry[]): Promise<void> {
  if (!mcpServers || mcpServers.length === 0) return;

  const catalog = loadMCPServersCatalog();
  const catalogMap = new Map(catalog.servers.map((s) => [s.id, s]));

  for (const server of mcpServers) {
    if (!server.enabled) continue;

    const catalogEntry = catalogMap.get(server.id);
    if (!catalogEntry) continue;

    if (catalogEntry.keychainKey) {
      const token = await getBotToken(catalogEntry.keychainKey);
      if (token) {
        const envKey = `MCP_TOKEN_${server.id.toUpperCase().replace(/-/g, "_")}`;
        process.env[envKey] = token;
      }
    }

    if (catalogEntry.additionalTokens) {
      for (const additional of catalogEntry.additionalTokens) {
        const token = await getBotToken(additional.keychainKey);
        if (token) {
          const envKey = `MCP_TOKEN_${additional.keychainKey.toUpperCase().replace(/-/g, "_")}`;
          process.env[envKey] = token;
        }
      }
    }
  }
}

export async function startCommand(_options: { daemon?: boolean }) {
  const rawConfig = loadConfig();

  if (!rawConfig) {
    console.log();
    centerLog(chalk.yellow("⚠️  TxtCode is not configured yet."));
    console.log();
    centerLog(chalk.white("Please run authentication to get started."));
    console.log();
    process.exit(1);
  }

  const config = rawConfig as unknown as Config;

  logger.info(chalk.blue.bold("\nStarting TxtCode Agent\n"));
  logger.info(chalk.cyan(`Platform: ${config.platform}`));
  logger.info(chalk.cyan(`IDE: ${config.ideType}\n`));

  const apiKey = await getApiKey(config.aiProvider);
  if (!apiKey) {
    console.log();
    centerLog(chalk.red("[ERROR] Failed to retrieve API key from keychain"));
    console.log();
    centerLog(chalk.yellow("Please run authentication"));
    console.log();
    process.exit(1);
  }

  let telegramToken = "";
  let discordToken = "";

  if (config.platform === "telegram") {
    telegramToken = await loadPlatformToken("Telegram", "telegram");
  } else if (config.platform === "discord") {
    discordToken = await loadPlatformToken("Discord", "discord");
  } else if (config.platform === "slack") {
    process.env.SLACK_BOT_TOKEN = await loadPlatformToken("Slack Bot", "slack-bot");
    process.env.SLACK_APP_TOKEN = await loadPlatformToken("Slack App", "slack-app");
    process.env.SLACK_SIGNING_SECRET = await loadPlatformToken(
      "Slack Signing Secret",
      "slack-signing",
    );
  } else if (config.platform === "teams") {
    process.env.TEAMS_APP_ID = await loadPlatformToken("Teams App ID", "teams-app-id");
    process.env.TEAMS_APP_PASSWORD = await loadPlatformToken(
      "Teams App Password",
      "teams-app-password",
    );
    process.env.TEAMS_TENANT_ID = await loadPlatformToken("Teams Tenant ID", "teams-tenant-id");
  } else if (config.platform === "signal") {
    process.env.SIGNAL_PHONE_NUMBER = await loadPlatformToken(
      "Signal Phone Number",
      "signal-phone",
    );
    const signalApiUrl = (await getBotToken("signal-api-url")) || "http://localhost:8080";
    process.env.SIGNAL_CLI_REST_URL = signalApiUrl;
  }

  process.env.PLATFORM = config.platform;
  process.env.TELEGRAM_BOT_TOKEN = telegramToken;
  process.env.DISCORD_BOT_TOKEN = discordToken;
  process.env.IDE_TYPE = config.ideType;
  process.env.IDE_PORT = String(config.idePort);
  process.env.AI_API_KEY = apiKey;
  process.env.AI_PROVIDER = config.aiProvider;
  process.env.AI_MODEL = config.aiModel;
  process.env.PROJECT_PATH = config.projectPath || process.cwd();
  process.env.OLLAMA_MODEL = config.ollamaModel || "gpt-oss:20b";
  process.env.CLAUDE_MODEL = config.claudeModel || "sonnet";
  process.env.GEMINI_MODEL = config.geminiModel || "";

  await loadMCPTokens(config.mcpServers || []);

  const agent = new AgentCore();
  await agent.init();

  const shutdownHandler = async () => {
    logger.debug("Shutting down MCP servers...");
    await agent.shutdown();
    process.exit(0);
  };
  process.on("SIGINT", shutdownHandler);
  process.on("SIGTERM", shutdownHandler);

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
    } else if (config.platform === "slack") {
      const bot = new SlackBot(agent);
      await bot.start();
    } else if (config.platform === "teams") {
      const bot = new TeamsBot(agent);
      await bot.start();
    } else if (config.platform === "signal") {
      const bot = new SignalBot(agent);
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
