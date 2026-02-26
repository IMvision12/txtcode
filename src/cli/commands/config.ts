import fs from "fs";
import os from "os";
import path from "path";
import chalk from "chalk";
import { setBotToken } from "../../utils/keychain";
import { centerLog, showCenteredList, showCenteredInput } from "../tui";
import { loadConfig } from "./auth";

const CONFIG_DIR = path.join(os.homedir(), ".txtcode");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export async function configCommand() {
  const existingConfig = loadConfig();

  if (!existingConfig) {
    console.clear();
    console.log();
    centerLog(chalk.yellow("⚠️  No configuration found."));
    console.log();
    centerLog(chalk.white("Please run authentication first."));
    console.log();
    return;
  }

  console.clear();
  console.log();
  centerLog(chalk.blue.bold("🔧 TxtCode Configuration"));
  console.log();
  centerLog(chalk.gray("What would you like to change?"));
  console.log();

  const configType = await showCenteredList({
    message: "Select what to configure: (Use arrow keys)",
    choices: [
      { name: "Change Messaging Platform", value: "platform" },
      { name: "Change IDE Type", value: "ide" },
      { name: "Change AI Provider", value: "ai" },
      { name: "Change Project Path", value: "project" },
      { name: "View Current Config", value: "view" },
      { name: "Cancel", value: "cancel" },
    ],
  });

  if (configType === "cancel") {
    console.log();
    centerLog(chalk.gray("Cancelled."));
    console.log();
    return;
  }

  switch (configType) {
    case "platform":
      await configurePlatform(existingConfig);
      break;
    case "ide":
      await configureIDE(existingConfig);
      break;
    case "ai":
      await configureAI(existingConfig);
      break;
    case "project":
      await configureProject(existingConfig);
      break;
    case "view":
      viewConfig(existingConfig);
      break;
  }
}

async function configurePlatform(config: any) {
  console.log();
  centerLog(chalk.cyan("📱 Messaging Platform Configuration"));
  console.log();

  const platform = await showCenteredList({
    message: "Select messaging platform: (Use arrow keys)",
    choices: [
      { name: "📱 WhatsApp", value: "whatsapp" },
      { name: "✈️  Telegram", value: "telegram" },
      { name: "💬 Discord", value: "discord" },
    ],
  });

  config.platform = platform;

  // Get tokens if needed and store in keychain
  if (platform === "telegram") {
    const token = await showCenteredInput({
      message: "Enter Telegram Bot Token:",
      password: true,
    });
    await setBotToken("telegram", token);
  } else if (platform === "discord") {
    const token = await showCenteredInput({
      message: "Enter Discord Bot Token:",
      password: true,
    });
    await setBotToken("discord", token);
  }

  saveConfig(config);
  console.log();
  centerLog(chalk.green("✅ Platform configuration updated!"));
  console.log();
}

async function configureIDE(config: any) {
  console.log();
  centerLog(chalk.cyan("🤖 IDE Configuration"));
  console.log();

  const ideType = await showCenteredList({
    message: "Select IDE type: (Use arrow keys)",
    choices: [
      { name: "Claude Code (Official - Anthropic API)", value: "claude-code" },
      { name: "Cursor CLI (Headless)", value: "cursor" },
      { name: "Claude Code (Ollama - Local & Free)", value: "ollama-claude-code" },
      { name: "Gemini Code (Google AI API)", value: "gemini-code" },
      { name: "Kiro CLI (AWS)", value: "kiro" },
      { name: "OpenCode (Open Source - Multi-Provider)", value: "opencode" },
      { name: "OpenAI Codex (OpenAI API)", value: "codex" },
    ],
  });

  config.ideType = ideType;

  // Ask for model based on IDE type
  if (ideType === "claude-code") {
    const model = await showCenteredInput({
      message: "Claude model (sonnet, opus, haiku):",
    });
    config.claudeModel = model || "sonnet";
  } else if (ideType === "ollama-claude-code") {
    const model = await showCenteredInput({
      message: "Ollama model:",
    });
    config.ollamaModel = model || "gpt-oss:20b";
  } else if (ideType === "gemini-code") {
    const model = await showCenteredInput({
      message: "Gemini model (leave empty for default):",
    });
    config.geminiModel = model || "";
  }

  saveConfig(config);
  console.log();
  centerLog(chalk.green("✅ IDE configuration updated!"));
  console.log();
}

async function configureAI(config: any) {
  console.log();
  centerLog(chalk.cyan("🧠 AI Provider Configuration"));
  console.log();
  centerLog(chalk.yellow("Note: This updates the primary provider only."));
  console.log();
  centerLog(chalk.gray("To reconfigure all providers, run authentication again."));
  console.log();

  // Get list of already configured providers
  const configuredProviders = config.providers || {};
  const providerList = Object.keys(configuredProviders);

  if (providerList.length === 0) {
    console.log();
    centerLog(chalk.red("[ERROR] No providers configured."));
    console.log();
    centerLog(chalk.yellow("Please run authentication first to configure providers."));
    console.log();
    return;
  }

  // Show configured providers
  const providerChoices = providerList.map((providerId) => ({
    name: `${providerId} (${configuredProviders[providerId].model})`,
    value: providerId,
  }));

  const selectedProvider = await showCenteredList({
    message: "Select Primary Provider: (Use arrow keys)",
    choices: providerChoices,
  });

  // Update top-level fields to match selected provider
  config.aiProvider = selectedProvider;
  config.aiModel = configuredProviders[selectedProvider].model;
  config.updatedAt = new Date().toISOString();

  saveConfig(config);
  console.log();
  centerLog(chalk.green("✅ Primary provider updated!"));
  console.log();
  centerLog(chalk.white(`Active: ${selectedProvider} (${config.aiModel})`));
  console.log();
  centerLog(
    chalk.gray("Note: To change API key or add/remove providers, run authentication again."),
  );
  console.log();
}

async function configureProject(config: any) {
  console.log();
  centerLog(chalk.cyan("📁 Project Path Configuration"));
  console.log();

  const projectPath = await showCenteredInput({
    message: "Enter your project path:",
  });

  config.projectPath = projectPath || config.projectPath || process.cwd();

  saveConfig(config);
  console.log();
  centerLog(chalk.green("✅ Project path updated!"));
  console.log();
}

function viewConfig(config: any) {
  console.log();
  centerLog(chalk.cyan("Current Configuration"));
  console.log();
  centerLog(chalk.white("Platform: ") + chalk.yellow(config.platform));
  centerLog(chalk.white("IDE Type: ") + chalk.yellow(config.ideType));
  centerLog(chalk.white("AI Provider: ") + chalk.yellow(config.aiProvider));

  if (config.projectPath) {
    centerLog(chalk.white("Project Path: ") + chalk.yellow(config.projectPath));
  }

  if (config.ollamaModel) {
    centerLog(chalk.white("Ollama Model: ") + chalk.yellow(config.ollamaModel));
  }

  if (config.claudeModel) {
    centerLog(chalk.white("Claude Model: ") + chalk.yellow(config.claudeModel));
  }

  if (config.geminiModel) {
    centerLog(chalk.white("Gemini Model: ") + chalk.yellow(config.geminiModel));
  }

  if (config.authorizedUser) {
    centerLog(chalk.white("Authorized User: ") + chalk.yellow(config.authorizedUser));
  }

  centerLog(
    chalk.white("Configured At: ") + chalk.yellow(new Date(config.configuredAt).toLocaleString()),
  );
  console.log();
  centerLog(chalk.gray(`Config file: ${CONFIG_FILE}`));
  console.log();
}

function saveConfig(config: any) {
  config.updatedAt = new Date().toISOString();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
