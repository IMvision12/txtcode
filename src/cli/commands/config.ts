import fs from "fs";
import os from "os";
import path from "path";
import chalk from "chalk";
import type { MCPServerEntry } from "../../shared/types";
import { setBotToken } from "../../utils/keychain";
import { loadMCPServersCatalog } from "../../utils/mcp-catalog-loader";
import { centerLog, showCenteredList, showCenteredInput, showCenteredConfirm } from "../tui";
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
      { name: "Manage MCP Servers", value: "mcp" },
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
    case "mcp":
      await configureMCP(existingConfig);
      break;
    case "project":
      await configureProject(existingConfig);
      break;
    case "view":
      viewConfig(existingConfig);
      break;
  }
}

async function configurePlatform(config: Record<string, unknown>) {
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

async function configureIDE(config: Record<string, unknown>) {
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

async function configureAI(config: Record<string, unknown>) {
  console.log();
  centerLog(chalk.cyan("🧠 AI Provider Configuration"));
  console.log();
  centerLog(chalk.yellow("Note: This updates the primary provider only."));
  console.log();
  centerLog(chalk.gray("To reconfigure all providers, run authentication again."));
  console.log();

  const configuredProviders = (config.providers || {}) as Record<string, { model: string }>;
  const providerList = Object.keys(configuredProviders);

  if (providerList.length === 0) {
    console.log();
    centerLog(chalk.red("[ERROR] No providers configured."));
    console.log();
    centerLog(chalk.yellow("Please run authentication first to configure providers."));
    console.log();
    return;
  }

  const providerChoices = providerList.map((providerId) => ({
    name: `${providerId} (${configuredProviders[providerId].model})`,
    value: providerId,
  }));

  const selectedProvider = await showCenteredList({
    message: "Select Primary Provider: (Use arrow keys)",
    choices: providerChoices,
  });

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

async function configureProject(config: Record<string, unknown>) {
  console.log();
  centerLog(chalk.cyan("📁 Project Path Configuration"));
  console.log();

  const projectPath = await showCenteredInput({
    message: "Enter your project path:",
  });

  config.projectPath = projectPath || (config.projectPath as string) || process.cwd();

  saveConfig(config);
  console.log();
  centerLog(chalk.green("✅ Project path updated!"));
  console.log();
}

function viewConfig(config: Record<string, unknown>) {
  console.log();
  centerLog(chalk.cyan("Current Configuration"));
  console.log();
  centerLog(chalk.white("Platform: ") + chalk.yellow(String(config.platform)));
  centerLog(chalk.white("IDE Type: ") + chalk.yellow(String(config.ideType)));
  centerLog(chalk.white("AI Provider: ") + chalk.yellow(String(config.aiProvider)));

  if (config.projectPath) {
    centerLog(chalk.white("Project Path: ") + chalk.yellow(String(config.projectPath)));
  }

  if (config.ollamaModel) {
    centerLog(chalk.white("Ollama Model: ") + chalk.yellow(String(config.ollamaModel)));
  }

  if (config.claudeModel) {
    centerLog(chalk.white("Claude Model: ") + chalk.yellow(String(config.claudeModel)));
  }

  if (config.geminiModel) {
    centerLog(chalk.white("Gemini Model: ") + chalk.yellow(String(config.geminiModel)));
  }

  if (config.authorizedUser) {
    centerLog(chalk.white("Authorized User: ") + chalk.yellow(String(config.authorizedUser)));
  }

  const mcpServers = (config.mcpServers || []) as MCPServerEntry[];
  if (mcpServers.length > 0) {
    console.log();
    centerLog(chalk.white("MCP Servers:"));
    for (const server of mcpServers) {
      const status = server.enabled ? chalk.green("enabled") : chalk.red("disabled");
      centerLog(chalk.gray(`  ${server.id} (${server.transport}) - ${status}`));
    }
  }

  centerLog(
    chalk.white("Configured At: ") +
      chalk.yellow(new Date(String(config.configuredAt)).toLocaleString()),
  );
  console.log();
  centerLog(chalk.gray(`Config file: ${CONFIG_FILE}`));
  console.log();
}

async function configureMCP(config: Record<string, unknown>) {
  console.log();
  centerLog(chalk.cyan("MCP Server Management"));
  console.log();

  const mcpServers = ((config.mcpServers || []) as MCPServerEntry[]).slice();

  if (mcpServers.length > 0) {
    centerLog(chalk.white("Currently configured:"));
    for (const server of mcpServers) {
      const status = server.enabled ? chalk.green("enabled") : chalk.red("disabled");
      centerLog(chalk.gray(`  ${server.id} (${server.transport}) - ${status}`));
    }
    console.log();
  } else {
    centerLog(chalk.gray("No MCP servers configured yet."));
    console.log();
  }

  const action = await showCenteredList({
    message: "What would you like to do?",
    choices: [
      { name: "Add server from catalog", value: "add" },
      { name: "Add custom server", value: "custom" },
      ...(mcpServers.length > 0
        ? [
            { name: "Enable/disable a server", value: "toggle" },
            { name: "Remove a server", value: "remove" },
          ]
        : []),
      { name: "Cancel", value: "cancel" },
    ],
  });

  if (action === "cancel") {
    return;
  }

  if (action === "add") {
    const catalog = loadMCPServersCatalog();
    const existingIds = new Set(mcpServers.map((s) => s.id));
    const available = catalog.servers.filter((s) => !existingIds.has(s.id));

    if (available.length === 0) {
      console.log();
      centerLog(chalk.yellow("All catalog servers are already configured."));
      console.log();
      return;
    }

    const categoryNames = catalog.categories as Record<string, string>;
    const choices = available.map((s) => {
      const label = categoryNames[s.category] || s.category;
      const tag = s.transport === "http" ? " [remote]" : "";
      return { name: `[${label}] ${s.name} - ${s.description}${tag}`, value: s.id };
    });

    const selectedId = await showCenteredList({
      message: "Select server to add:",
      choices,
      pageSize: 10,
    });

    const server = catalog.servers.find((s) => s.id === selectedId);
    if (!server) {
      return;
    }

    if (server.requiresToken) {
      console.log();
      const token = await showCenteredInput({
        message: server.tokenPrompt || `Enter token for ${server.name}:`,
        password: true,
      });
      await setBotToken(server.keychainKey, token);

      if (server.additionalTokens) {
        for (const additional of server.additionalTokens) {
          console.log();
          const additionalToken = await showCenteredInput({
            message: additional.tokenPrompt,
            password: !additional.tokenPrompt.toLowerCase().includes("region"),
          });
          await setBotToken(additional.keychainKey, additionalToken);
        }
      }
    }

    const entry: MCPServerEntry = {
      id: server.id,
      transport: server.transport,
      enabled: true,
    };

    if (server.transport === "stdio") {
      entry.command = server.command;
      entry.args = server.args ? [...server.args] : undefined;
      if (server.tokenIsArg && server.keychainKey) {
        entry.args = entry.args || [];
        entry.args.push(`__KEYCHAIN:${server.keychainKey}__`);
      }
    } else {
      entry.url = server.url;
    }

    mcpServers.push(entry);
    config.mcpServers = mcpServers;
    saveConfig(config);

    console.log();
    centerLog(chalk.green(`Added ${server.name}`));
    console.log();
  } else if (action === "custom") {
    console.log();
    const transport = await showCenteredList({
      message: "Transport type:",
      choices: [
        { name: "stdio (local command)", value: "stdio" },
        { name: "Streamable HTTP (remote URL)", value: "http" },
      ],
    });

    const id = await showCenteredInput({
      message: "Server ID (short name, no spaces):",
    });

    if (!id.trim()) {
      return;
    }

    const entry: MCPServerEntry = {
      id: id.trim(),
      transport: transport as "stdio" | "http",
      enabled: true,
    };

    if (transport === "stdio") {
      const command = await showCenteredInput({
        message: "Command (e.g. npx):",
      });
      const argsStr = await showCenteredInput({
        message: "Arguments (space-separated):",
      });

      entry.command = command.trim();
      entry.args = argsStr.trim() ? argsStr.trim().split(/\s+/) : undefined;
    } else {
      const url = await showCenteredInput({
        message: "Server URL:",
      });
      entry.url = url.trim();
    }

    const hasToken = await showCenteredConfirm({
      message: "Does this server require an auth token?",
      default: false,
    });

    if (hasToken) {
      const token = await showCenteredInput({
        message: "Enter token:",
        password: true,
      });
      await setBotToken(`mcp-${id.trim()}`, token);
    }

    mcpServers.push(entry);
    config.mcpServers = mcpServers;
    saveConfig(config);

    console.log();
    centerLog(chalk.green(`Added custom server: ${id.trim()}`));
    console.log();
  } else if (action === "toggle") {
    const choices = mcpServers.map((s) => ({
      name: `${s.id} - currently ${s.enabled ? "enabled" : "disabled"}`,
      value: s.id,
    }));

    const selectedId = await showCenteredList({
      message: "Select server to toggle:",
      choices,
    });

    const server = mcpServers.find((s) => s.id === selectedId);
    if (server) {
      server.enabled = !server.enabled;
      config.mcpServers = mcpServers;
      saveConfig(config);

      console.log();
      const status = server.enabled ? "enabled" : "disabled";
      centerLog(chalk.green(`${server.id} is now ${status}`));
      console.log();
    }
  } else if (action === "remove") {
    const choices = mcpServers.map((s) => ({
      name: `${s.id} (${s.transport})`,
      value: s.id,
    }));

    const selectedId = await showCenteredList({
      message: "Select server to remove:",
      choices,
    });

    const confirm = await showCenteredConfirm({
      message: `Remove ${selectedId}?`,
      default: false,
    });

    if (confirm) {
      config.mcpServers = mcpServers.filter((s) => s.id !== selectedId);
      saveConfig(config);

      console.log();
      centerLog(chalk.green(`Removed ${selectedId}`));
      console.log();
    }
  }
}

function saveConfig(config: Record<string, unknown>) {
  config.updatedAt = new Date().toISOString();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
