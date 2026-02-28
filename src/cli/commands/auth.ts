import fs from "fs";
import os from "os";
import path from "path";
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import chalk from "chalk";
import qrcode from "qrcode-terminal";
import type { MCPServerEntry } from "../../shared/types";
import { setApiKey, setBotToken } from "../../utils/keychain";
import { loadMCPServersCatalog, type MCPCatalogServer } from "../../utils/mcp-catalog-loader";
import {
  discoverHuggingFaceModels,
  discoverOpenRouterModels,
} from "../../utils/model-discovery-util";
import { loadModelsCatalog } from "../../utils/models-catalog-loader";
import { showCenteredList, showCenteredInput, showCenteredConfirm } from "../tui";

const CONFIG_DIR = path.join(os.homedir(), ".txtcode");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const WA_AUTH_DIR = path.join(CONFIG_DIR, ".wacli_auth");

type BaileysLogger = NonNullable<Parameters<typeof makeWASocket>[0]["logger"]>;
const noop = () => {};
const silentLogger: BaileysLogger = {
  level: "silent" as const,
  fatal: noop,
  error: noop,
  warn: noop,
  info: noop,
  debug: noop,
  trace: noop,
  child: () => silentLogger,
} as BaileysLogger;

function validateApiKeyFormat(apiKey: string): { valid: boolean; error?: string } {
  const trimmed = apiKey.trim();

  if (!trimmed) {
    return { valid: false, error: "API key is required" };
  }

  return { valid: true };
}

function authenticateWhatsApp(): Promise<void> {
  let resolvePromise!: () => void;
  let rejectPromise!: (err: Error) => void;

  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const closeSock = (s: unknown, removeListeners = false) => {
    try {
      const socket = s as { ev?: { removeAllListeners: () => void }; ws?: { close: () => void } };
      if (removeListeners) {socket?.ev?.removeAllListeners();}
      socket?.ws?.close();
    } catch {
      // Ignore
    }
  };

  (async () => {
    let sock: ReturnType<typeof makeWASocket> | null = null;
    let pairingComplete = false;
    let connectionTimeout: NodeJS.Timeout;
    let connectionAttempted = false;

    try {
      if (fs.existsSync(WA_AUTH_DIR)) {
        const files = fs.readdirSync(WA_AUTH_DIR);
        if (files.length > 0) {
          console.log(chalk.yellow("Existing WhatsApp session found."));
          console.log(chalk.gray("Clearing old session to start fresh..."));
          console.log();

          try {
            fs.rmSync(WA_AUTH_DIR, { recursive: true, force: true });
            fs.mkdirSync(WA_AUTH_DIR, { recursive: true });
          } catch {
            console.log(chalk.yellow("Warning: Could not clear old session"));
          }
        }
      } else {
        fs.mkdirSync(WA_AUTH_DIR, { recursive: true });
      }

      console.log(chalk.gray("Initializing WhatsApp connection..."));
      console.log();

      const { state, saveCreds } = await useMultiFileAuthState(WA_AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      connectionTimeout = setTimeout(() => {
        if (!pairingComplete && sock) {
          closeSock(sock, true);
          if (!connectionAttempted) {
            rejectPromise(
              new Error(
                "Connection timeout - No response from WhatsApp servers. Please check your internet connection.",
              ),
            );
          } else {
            rejectPromise(new Error("QR code generation timeout - Please try again."));
          }
        }
      }, 60000);

      sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
        },
        version,
        printQRInTerminal: false,
        browser: ["TxtCode", "CLI", "1.0.0"],
        syncFullHistory: false,
        markOnlineOnConnect: false,
        logger: silentLogger,
      });

      let hasShownQR = false;

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async (update) => {
        connectionAttempted = true;
        const { connection, qr, lastDisconnect } = update;

        if (qr && !hasShownQR) {
          clearTimeout(connectionTimeout);
          hasShownQR = true;
          console.log();
          console.log(chalk.yellow("[QR] Scan this QR code with WhatsApp:"));
          console.log();
          qrcode.generate(qr, { small: true });
          console.log();
          console.log(chalk.gray("Open WhatsApp → Settings → Linked Devices → Link a Device"));
          console.log();

          connectionTimeout = setTimeout(() => {
            if (!pairingComplete) {
              closeSock(sock, true);
              rejectPromise(new Error("QR code scan timeout - Please try again"));
            }
          }, 120000);
        }

        if (connection === "open" && !pairingComplete) {
          clearTimeout(connectionTimeout);
          pairingComplete = true;
          console.log(chalk.green("\n[OK] WhatsApp authenticated successfully!"));

          // Keep socket alive so the phone can finalize the handshake
          setTimeout(() => {
            closeSock(sock, true);
            resolvePromise();
          }, 3000);
        }

        if (connection === "close" && !pairingComplete) {
          clearTimeout(connectionTimeout);
          const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
            ?.statusCode;
          const errorMessage = lastDisconnect?.error?.message || "Unknown error";

          if (!hasShownQR) {
            closeSock(sock, true);

            if (statusCode === 405) {
              rejectPromise(
                new Error(
                  `WhatsApp connection failed (Error 405). This usually means:\n  • WhatsApp updated their protocol and the library needs updating\n  • Try updating: npm install @whiskeysockets/baileys@latest\n  • Or use Telegram/Discord instead (more reliable)`,
                ),
              );
            } else {
              rejectPromise(
                new Error(
                  `Failed to connect to WhatsApp servers (${statusCode || "no status"}). ${errorMessage}. Please check your internet connection and try again.`,
                ),
              );
            }
            return;
          }

          if (statusCode === 515 && hasShownQR) {
            console.log(
              chalk.cyan("\n[INFO] WhatsApp pairing complete, restarting connection...\n"),
            );

            // 515 = stream replaced, normal after QR pairing.
            // Creds are already saved. Close old socket and create a fresh one from disk.
            closeSock(sock, true);

            try {
              const { state: freshState, saveCreds: freshSaveCreds } =
                await useMultiFileAuthState(WA_AUTH_DIR);
              const retrySock = makeWASocket({
                auth: {
                  creds: freshState.creds,
                  keys: makeCacheableSignalKeyStore(freshState.keys, silentLogger),
                },
                version,
                printQRInTerminal: false,
                browser: ["TxtCode", "CLI", "1.0.0"],
                syncFullHistory: false,
                markOnlineOnConnect: false,
                logger: silentLogger,
              });

              retrySock.ev.on("creds.update", freshSaveCreds);

              const retryTimeout = setTimeout(() => {
                if (!pairingComplete) {
                  closeSock(retrySock, true);
                  rejectPromise(
                    new Error("WhatsApp linking timed out after restart. Please try again."),
                  );
                }
              }, 30000);

              retrySock.ev.on("connection.update", (retryUpdate) => {
                if (retryUpdate.connection === "open") {
                  clearTimeout(retryTimeout);
                  pairingComplete = true;
                  console.log(chalk.green("[OK] WhatsApp linked successfully!\n"));
                  // Keep socket alive briefly so the phone can finalize the handshake
                  setTimeout(() => {
                    closeSock(retrySock, true);
                    resolvePromise();
                  }, 3000);
                }

                if (retryUpdate.connection === "close" && !pairingComplete) {
                  const retryStatusCode = (
                    retryUpdate as {
                      lastDisconnect?: { error?: { output?: { statusCode?: number } } };
                    }
                  )?.lastDisconnect?.error?.output?.statusCode;
                  if (retryStatusCode === 515) {
                    return;
                  }
                  clearTimeout(retryTimeout);
                  closeSock(retrySock, true);
                  rejectPromise(
                    new Error(
                      `WhatsApp authentication failed after restart (code: ${retryStatusCode})`,
                    ),
                  );
                }
              });
            } catch (err) {
              rejectPromise(
                err instanceof Error ? err : new Error("Failed to restart WhatsApp connection"),
              );
            }
          } else if (hasShownQR && statusCode !== 515) {
            closeSock(sock, true);
            rejectPromise(new Error(`WhatsApp authentication failed (code: ${statusCode})`));
          }
        }
      });
    } catch (error) {
      if (sock) {
        closeSock(sock, true);
      }
      rejectPromise(error instanceof Error ? error : new Error(String(error)));
    }
  })();

  return promise;
}

export async function authCommand() {
  console.clear();
  console.log();

  console.log(chalk.blue.bold("TxtCode Authentication"));
  console.log();
  console.log(chalk.gray("Configure your TxtCode CLI for remote coding CLI control"));
  console.log();

  const existingConfig = loadConfig();
  const existingProviders = existingConfig?.providers as
    | Record<string, { model: string }>
    | undefined;
  if (existingConfig && existingProviders) {
    console.log(chalk.yellow("⚠️  Existing configuration detected!"));
    console.log();
    console.log(chalk.gray("Currently configured providers:"));
    Object.keys(existingProviders).forEach((provider) => {
      const providerConfig = existingProviders[provider];
      console.log(chalk.white(`• ${provider} (${providerConfig.model})`));
    });
    console.log();

    const shouldOverwrite = await showCenteredConfirm({
      message: "Do you want to reconfigure? This will overwrite existing providers.",
      default: false,
    });

    if (!shouldOverwrite) {
      console.log();
      console.log(
        chalk.gray("Authentication cancelled. Use 'txtcode config' to modify individual settings."),
      );
      console.log();
      return;
    }
    console.log();
    console.log(chalk.yellow("Reconfiguring all providers..."));
    console.log();
  }

  const selectedProviders = new Set<string>();

  const modelsCatalog = loadModelsCatalog();

  function getAllProviders() {
    return Object.keys(modelsCatalog.providers).map((providerId) => {
      const providerData = modelsCatalog.providers[providerId];
      return {
        name: providerData.name,
        value: providerId,
      };
    });
  }

  async function configureProvider(
    label: string,
  ): Promise<{ provider: string; apiKey: string; model: string } | null> {
    console.log();

    console.log(chalk.cyan(label));
    console.log();

    const providers = getAllProviders();
    const availableProviders = providers.filter((p) => !selectedProviders.has(p.value));

    if (availableProviders.length === 0) {
      throw new Error("No more providers available to configure");
    }

    const providerChoices =
      label === "Primary AI Provider"
        ? availableProviders
        : [...availableProviders, { name: "← Back", value: "__BACK__" }];

    const providerValue = await showCenteredList({
      message: `Select ${label}: (Use arrow keys)`,
      choices: providerChoices,
    });

    if (providerValue === "__BACK__") {
      return null;
    }

    const apiKey = await showCenteredInput({
      message: "Enter API Key:",
      password: true,
      validate: (input) => input.length > 0 || "API key is required",
    });

    console.log();

    const validation = validateApiKeyFormat(apiKey);

    if (!validation.valid) {
      console.log();
      console.log(chalk.red(`[ERROR] ${validation.error}`));
      console.log();

      const retry = await showCenteredConfirm({
        message: "Would you like to enter a different API key?",
        default: true,
      });

      if (retry) {
        return await configureProvider(label);
      } else {
        throw new Error(
          "API key validation failed. Please run 'txtcode auth' again with a valid key.",
        );
      }
    }

    selectedProviders.add(providerValue);

    let modelChoices: Array<{ name: string; value: string }>;

    if (providerValue === "huggingface") {
      console.log(chalk.gray("Discovering available models from HuggingFace..."));
      try {
        const discoveredModels = await discoverHuggingFaceModels(apiKey);
        modelChoices = discoveredModels.map((model) => ({
          name: model.description ? `${model.name} - ${model.description}` : model.name,
          value: model.id,
        }));
        console.log(chalk.green(`Found ${discoveredModels.length} models\n`));
      } catch (error) {
        console.log();
        console.log(
          chalk.red(
            `[ERROR] Failed to discover HuggingFace models: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
        );
        console.log(chalk.yellow("Please check your API key and try again."));
        console.log();

        const retry = await showCenteredConfirm({
          message: "Would you like to enter a different API key?",
          default: true,
        });

        if (retry) {
          return await configureProvider(label);
        } else {
          throw new Error(
            "HuggingFace model discovery failed. Please run 'txtcode auth' again with a valid API key.",
            { cause: error },
          );
        }
      }
    } else if (providerValue === "openrouter") {
      console.log(chalk.gray("Discovering available models from OpenRouter..."));
      try {
        const discoveredModels = await discoverOpenRouterModels(apiKey);
        modelChoices = discoveredModels.map((model) => ({
          name: model.description ? `${model.name} - ${model.description}` : model.name,
          value: model.id,
        }));
        console.log(chalk.green(`Found ${discoveredModels.length} models\n`));
      } catch (error) {
        console.log();
        console.log(
          chalk.red(
            `[ERROR] Failed to discover OpenRouter models: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
        );
        console.log(chalk.yellow("Please check your API key and try again."));
        console.log();

        const retry = await showCenteredConfirm({
          message: "Would you like to enter a different API key?",
          default: true,
        });

        if (retry) {
          return await configureProvider(label);
        } else {
          throw new Error(
            "OpenRouter model discovery failed. Please run 'txtcode auth' again with a valid API key.",
            { cause: error },
          );
        }
      }
    } else {
      const providerModels = modelsCatalog.providers[providerValue];
      modelChoices = providerModels.models.map(
        (model: { id: string; name: string; recommended?: boolean }) => ({
          name: model.recommended ? `${model.name} - Recommended` : model.name,
          value: model.id,
        }),
      );
    }

    const modelChoicesWithCustom = [
      { name: "Enter custom model name", value: "__CUSTOM__" },
      ...modelChoices,
    ];

    console.log();

    const usePagination = providerValue === "openrouter" || providerValue === "huggingface";

    const selectedModel = await showCenteredList({
      message: "Select model: (Use arrow keys)",
      choices: modelChoicesWithCustom,
      pageSize: usePagination ? 10 : undefined,
    });

    let finalModel = selectedModel;

    if (selectedModel === "__CUSTOM__") {
      finalModel = await showCenteredInput({
        message: "Enter model name/ID:",
        validate: (input) => input.trim().length > 0 || "Model name is required",
      });
      console.log();
      console.log(chalk.gray(`Using custom model: ${finalModel}`));
      console.log();
    }

    console.log();
    console.log(chalk.green(`${label} configured: ${providerValue} (${finalModel})`));
    console.log();

    return {
      provider: providerValue,
      apiKey: apiKey,
      model: finalModel,
    };
  }

  let primaryProvider = await configureProvider("Primary AI Provider");

  while (primaryProvider === null) {
    console.log(chalk.yellow("\nPrimary provider is required. Please select a provider.\n"));
    primaryProvider = await configureProvider("Primary AI Provider");
  }

  const configuredProviders: Array<{ provider: string; apiKey: string; model: string }> = [
    primaryProvider,
  ];

  let continueAdding = true;
  let providerCount = 1;

  while (continueAdding) {
    const allProviders = getAllProviders();
    const remainingProviders = allProviders.filter((p) => !selectedProviders.has(p.value));

    if (remainingProviders.length === 0) {
      console.log(
        chalk.yellow(`\n✓ All available providers configured (${providerCount} total)\n`),
      );
      break;
    }

    const addMore = await showCenteredConfirm({
      message: `Add another provider for hot-switching? (${providerCount} configured, ${remainingProviders.length} available)`,
      default: providerCount === 1,
    });

    if (!addMore) {
      continueAdding = false;
      break;
    }

    providerCount++;
    const secondaryProvider = await configureProvider(
      `Secondary AI Provider #${providerCount - 1}`,
    );

    if (secondaryProvider === null) {
      providerCount--;
      continue;
    }

    configuredProviders.push(secondaryProvider);
  }

  const allProviderNames = configuredProviders.map((p) => p.provider);
  const uniqueProviders = new Set(allProviderNames);

  if (uniqueProviders.size !== allProviderNames.length) {
    console.log(
      chalk.red("\n[ERROR] Duplicate providers detected. Each provider must be unique.\n"),
    );
    console.log(chalk.yellow("Please run 'txtcode auth' again and select different providers.\n"));
    process.exit(1);
  }

  console.log();
  console.log(chalk.green(`✅ Configured ${configuredProviders.length} provider(s)`));
  console.log();

  const mcpServerEntries = await configureMCPServers();

  const platform = await showCenteredList({
    message: "Select messaging platform: (Use arrow keys)",
    choices: [
      { name: "WhatsApp", value: "whatsapp" },
      { name: "Telegram", value: "telegram" },
      { name: "Discord", value: "discord" },
      { name: "Slack", value: "slack" },
      { name: "Microsoft Teams", value: "teams" },
      { name: "Signal", value: "signal" },
    ],
  });

  let telegramToken = "";
  let discordToken = "";
  let slackBotToken = "";
  let slackAppToken = "";
  let slackSigningSecret = "";
  let teamsAppId = "";
  let teamsAppPassword = "";
  let teamsTenantId = "";
  let signalPhoneNumber = "";
  let signalCliRestUrl = "";

  if (platform === "telegram") {
    console.log();
    console.log(chalk.cyan("Telegram Bot Setup"));
    console.log();
    console.log(chalk.gray("1. Open Telegram and search for @BotFather"));
    console.log(chalk.gray("2. Send /newbot and follow the instructions"));
    console.log(chalk.gray("3. Copy the bot token you receive"));
    console.log();

    telegramToken = await showCenteredInput({
      message: "Enter Telegram Bot Token:",
      password: true,
      validate: (input) => input.length > 0 || "Token is required",
    });
    console.log();
    console.log(chalk.green("Telegram bot configured"));
    console.log();
  } else if (platform === "discord") {
    console.log();
    console.log(chalk.cyan("Discord Bot Setup"));
    console.log();
    console.log(chalk.gray("1. Go to https://discord.com/developers/applications"));
    console.log(chalk.gray("2. Create a New Application"));
    console.log(chalk.gray("3. Go to Bot → Add Bot"));
    console.log(chalk.gray("4. Copy the bot token"));
    console.log(chalk.gray("5. Enable MESSAGE CONTENT INTENT"));
    console.log();

    discordToken = await showCenteredInput({
      message: "Enter Discord Bot Token:",
      password: true,
      validate: (input) => input.length > 0 || "Token is required",
    });
    console.log();
    console.log(chalk.green("Discord bot configured"));
    console.log();
  } else if (platform === "slack") {
    console.log();
    console.log(chalk.cyan("Slack Bot Setup"));
    console.log();
    console.log(chalk.gray("1. Go to https://api.slack.com/apps and create a new app"));
    console.log(chalk.gray("2. Enable Socket Mode (Settings → Socket Mode)"));
    console.log(
      chalk.gray(
        "3. Add Bot Token Scopes: chat:write, channels:history, groups:history, im:history, mpim:history",
      ),
    );
    console.log(chalk.gray("4. Install the app to your workspace"));
    console.log(
      chalk.gray(
        "5. Subscribe to bot events: message.channels, message.groups, message.im, message.mpim",
      ),
    );
    console.log();

    slackBotToken = await showCenteredInput({
      message: "Enter Slack Bot Token (xoxb-...):",
      password: true,
      validate: (input) => input.length > 0 || "Bot token is required",
    });
    console.log();

    slackAppToken = await showCenteredInput({
      message: "Enter Slack App-Level Token (xapp-...):",
      password: true,
      validate: (input) => input.length > 0 || "App token is required",
    });
    console.log();

    slackSigningSecret = await showCenteredInput({
      message: "Enter Slack Signing Secret:",
      password: true,
      validate: (input) => input.length > 0 || "Signing secret is required",
    });
    console.log();
    console.log(chalk.green("Slack bot configured"));
    console.log();
  } else if (platform === "teams") {
    console.log();
    console.log(chalk.cyan("Microsoft Teams Bot Setup"));
    console.log();
    console.log(chalk.gray("1. Go to https://dev.teams.microsoft.com/bots"));
    console.log(chalk.gray("2. Create a new Bot registration"));
    console.log(chalk.gray("3. Copy the App ID and generate a client secret"));
    console.log(chalk.gray("4. Set the messaging endpoint to https://<your-domain>/api/messages"));
    console.log();

    teamsAppId = await showCenteredInput({
      message: "Enter Teams App (Bot) ID:",
      password: false,
      validate: (input) => input.length > 0 || "App ID is required",
    });
    console.log();

    teamsAppPassword = await showCenteredInput({
      message: "Enter Teams App Password (Client Secret):",
      password: true,
      validate: (input) => input.length > 0 || "App password is required",
    });
    console.log();

    teamsTenantId = await showCenteredInput({
      message: "Enter Azure Tenant ID:",
      password: false,
      validate: (input) => input.length > 0 || "Tenant ID is required",
    });
    console.log();
    console.log(chalk.green("Microsoft Teams bot configured"));
    console.log();
  } else if (platform === "signal") {
    console.log();
    console.log(chalk.cyan("Signal Bot Setup"));
    console.log();
    console.log(chalk.gray("Signal requires signal-cli-rest-api running as a companion service."));
    console.log();
    console.log(chalk.gray("Setup:"));
    console.log(chalk.gray("  1. Run signal-cli-rest-api via Docker:"));
    console.log(chalk.white("     docker run -p 8080:8080 bbernhard/signal-cli-rest-api"));
    console.log(chalk.gray("  2. Register/link your phone number with signal-cli"));
    console.log(chalk.gray("  3. Provide the phone number and API URL below"));
    console.log();

    signalPhoneNumber = await showCenteredInput({
      message: "Enter Signal phone number (e.g. +1234567890):",
      password: false,
      validate: (input) => input.startsWith("+") || "Phone number must start with +",
    });
    console.log();

    signalCliRestUrl = await showCenteredInput({
      message: "Enter signal-cli-rest-api URL (default: http://localhost:8080):",
      password: false,
      validate: () => true,
    });
    if (!signalCliRestUrl.trim()) {
      signalCliRestUrl = "http://localhost:8080";
    }
    console.log();
    console.log(chalk.green("Signal bot configured"));
    console.log();
  } else {
    console.log();
    console.log(chalk.cyan("WhatsApp Setup"));
    console.log();

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.removeAllListeners("keypress");
    process.stdin.pause();

    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      await authenticateWhatsApp();
      console.log();
      console.log(chalk.green("WhatsApp authenticated successfully!"));
      console.log();
    } catch (error) {
      console.log();
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      if (errorMsg.includes("405")) {
        console.log(chalk.red(`[ERROR] WhatsApp authentication failed (Error 405)`));
        console.log();
        console.log(chalk.yellow("This is a known issue with WhatsApp's protocol changes."));
        console.log(chalk.yellow("The WhatsApp library needs to be updated by the maintainers."));
        console.log();
        console.log(chalk.cyan("Recommended alternatives:"));
        console.log(chalk.white("  • Telegram - More stable and reliable"));
        console.log(chalk.white("  • Discord - Also very stable"));
        console.log(chalk.white("  • Slack - Great for workspace integration"));
        console.log(chalk.white("  • Signal - Privacy-focused alternative"));
        console.log();
        console.log(chalk.gray("Would you like to restart and choose a different platform?"));
      } else {
        console.log(chalk.red(`[ERROR] WhatsApp authentication failed: ${errorMsg}`));
        console.log();
        console.log(chalk.yellow("Please try running authentication again."));
      }
      console.log();
      process.exit(1);
    }
  }

  const ideType = await showCenteredList({
    message: "Select coding adapter: (Use arrow keys)",
    choices: [
      { name: "Claude Code (Anthropic)", value: "claude-code" },
      { name: "Cursor CLI (Headless)", value: "cursor" },
      { name: "OpenAI Codex (OpenAI)", value: "codex" },
      { name: "Gemini CLI (Google)", value: "gemini-code" },
      { name: "Kiro CLI (AWS)", value: "kiro" },
      { name: "OpenCode (Open Source, Multi-Provider)", value: "opencode" },
      { name: "Ollama Claude Code (Local, Free)", value: "ollama-claude-code" },
    ],
  });

  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  try {
    for (const provider of configuredProviders) {
      await setApiKey(provider.provider, provider.apiKey);
    }

    if (telegramToken) {
      await setBotToken("telegram", telegramToken);
    }
    if (discordToken) {
      await setBotToken("discord", discordToken);
    }
    if (slackBotToken) {
      await setBotToken("slack-bot", slackBotToken);
      await setBotToken("slack-app", slackAppToken);
      await setBotToken("slack-signing", slackSigningSecret);
    }
    if (teamsAppId) {
      await setBotToken("teams-app-id", teamsAppId);
      await setBotToken("teams-app-password", teamsAppPassword);
      await setBotToken("teams-tenant-id", teamsTenantId);
    }
    if (signalPhoneNumber) {
      await setBotToken("signal-phone", signalPhoneNumber);
      await setBotToken("signal-api-url", signalCliRestUrl);
    }
  } catch (keychainError) {
    console.log(chalk.red("\n[ERROR] Failed to store credentials in keychain"));
    console.log(chalk.yellow("Credentials will be unavailable until keychain access is restored."));
    console.log(
      chalk.gray(
        `Details: ${keychainError instanceof Error ? keychainError.message : String(keychainError)}`,
      ),
    );
    console.log(chalk.gray("Re-run 'txtcode' → 'Authenticate' to retry.\n"));
  }

  const providersConfig: { [key: string]: { model: string } } = {};
  for (const provider of configuredProviders) {
    providersConfig[provider.provider] = {
      model: provider.model,
    };
  }

  const config = {
    aiProvider: primaryProvider.provider,
    aiModel: primaryProvider.model,

    providers: providersConfig,

    platform: platform,
    ideType: ideType,
    idePort: 3000,
    authorizedUser: "",
    configuredAt: new Date().toISOString(),

    mcpServers: mcpServerEntries,
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  try {
    if (process.platform === "win32") {
      const { execSync } = require("child_process");
      const user = process.env.USERNAME || process.env.USER || "";
      if (user) {
        execSync(`icacls "${CONFIG_DIR}" /inheritance:r /grant:r "${user}:(OI)(CI)F" /T`, {
          stdio: "ignore",
        });
        execSync(`icacls "${CONFIG_FILE}" /inheritance:r /grant:r "${user}:F"`, {
          stdio: "ignore",
        });
      }
    } else {
      fs.chmodSync(CONFIG_DIR, 0o700);
      fs.chmodSync(CONFIG_FILE, 0o600);
    }
  } catch {}

  console.log(chalk.green("\nAuthentication successful!"));
  console.log(chalk.gray(`\nConfiguration saved to: ${CONFIG_FILE}`));
  console.log(chalk.cyan("\nConfigured Providers:"));

  configuredProviders.forEach((provider, index) => {
    const label = index === 0 ? "Primary" : `Secondary ${index}`;
    console.log(chalk.white(`  ${label}: ${provider.provider} (${provider.model})`));
  });

  if (mcpServerEntries.length > 0) {
    console.log(chalk.cyan("\nMCP Servers:"));
    mcpServerEntries.forEach((server) => {
      const status = server.enabled ? chalk.green("enabled") : chalk.gray("disabled");
      console.log(chalk.white(`  ${server.id} (${server.transport}) - ${status}`));
    });
  }

  console.log(
    chalk.cyan("\nRun ") +
      chalk.bold("txtcode") +
      chalk.cyan(" and choose ") +
      chalk.bold("Start Agent") +
      chalk.cyan(" to begin.\n"),
  );

  if (configuredProviders.length > 1) {
    console.log(chalk.gray("  Use /switch to change between your configured providers\n"));
  }
}

async function configureMCPServers(): Promise<MCPServerEntry[]> {
  const catalog = loadMCPServersCatalog();
  if (!catalog || catalog.servers.length === 0) {
    return [];
  }

  console.log(chalk.cyan("MCP Servers (optional)"));
  console.log();
  console.log(
    chalk.gray("Connect external tools to your AI provider (GitHub, databases, cloud, etc.)"),
  );
  console.log();

  const categoryNames = catalog.categories as Record<string, string>;
  const serversByCategory = new Map<string, MCPCatalogServer[]>();
  for (const server of catalog.servers) {
    const cat = server.category || "other";
    if (!serversByCategory.has(cat)) {
      serversByCategory.set(cat, []);
    }
    serversByCategory.get(cat)!.push(server);
  }

  const selectedServers: MCPCatalogServer[] = [];
  const selectedIds = new Set<string>();

  let continueSelecting = true;
  while (continueSelecting) {
    const choices: Array<{ name: string; value: string }> = [
      { name: "Configure later", value: "__SKIP__" },
    ];

    if (selectedServers.length > 0) {
      choices[0] = { name: `← Done (${selectedServers.length} selected)`, value: "__SKIP__" };
    }

    for (const [category, servers] of serversByCategory) {
      const label = categoryNames[category] || category;
      for (const server of servers) {
        if (selectedIds.has(server.id)) {
          continue;
        }
        const transportTag = server.transport === "http" ? " [remote]" : "";
        choices.push({
          name: `[${label}] ${server.name} - ${server.description}${transportTag}`,
          value: server.id,
        });
      }
    }

    if (choices.length === 1) {
      console.log(chalk.yellow("\nAll available MCP servers have been selected.\n"));
      break;
    }

    const selected = await showCenteredList({
      message:
        selectedServers.length > 0
          ? `Add another MCP server: (Use arrow keys)`
          : `Select MCP server to connect: (Use arrow keys)`,
      choices,
      pageSize: 10,
    });

    if (selected === "__SKIP__") {
      if (selectedServers.length === 0) {
        console.log();
        console.log(
          chalk.gray(
            "You can configure MCP servers anytime from 'txtcode config' → 'Manage MCP Servers'.",
          ),
        );
        console.log();
      }
      continueSelecting = false;
      break;
    }

    const server = catalog.servers.find((s) => s.id === selected);
    if (!server) {
      continue;
    }

    selectedIds.add(server.id);

    if (server.requiresToken) {
      console.log();
      const token = await showCenteredInput({
        message: server.tokenPrompt || `Enter token for ${server.name}:`,
        password: true,
        validate: (input) => input.length > 0 || "Token/credential is required",
      });
      await setBotToken(server.keychainKey, token);

      if (server.additionalTokens) {
        for (const additional of server.additionalTokens) {
          console.log();
          const additionalToken = await showCenteredInput({
            message: additional.tokenPrompt,
            password: !additional.tokenPrompt.toLowerCase().includes("region"),
            validate: (input) => input.length > 0 || "This field is required",
          });
          await setBotToken(additional.keychainKey, additionalToken);
        }
      }
    }

    selectedServers.push(server);
    console.log();
    console.log(chalk.white("  Connected servers:"));
    for (const s of selectedServers) {
      console.log(chalk.green(`    ✅ ${s.name}`));
    }
    console.log();
  }

  if (selectedServers.length > 0) {
    console.log();
    console.log(chalk.green(`✅ Configured ${selectedServers.length} MCP server(s)`));
    console.log();
  }

  return selectedServers.map((server): MCPServerEntry => {
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

    return entry;
  });
}

export function loadConfig(): Record<string, unknown> | null {
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }

  try {
    const data = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}
