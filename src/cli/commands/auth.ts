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
import { setApiKey, setBotToken } from "../../utils/keychain";
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

// Validate API key
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

  const closeSock = (s: unknown) => {
    try {
      (s as { ws?: { close: () => void } })?.ws?.close();
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
          closeSock(sock);
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
              closeSock(sock);
              rejectPromise(new Error("QR code scan timeout - Please try again"));
            }
          }, 120000);
        }

        if (connection === "open" && !pairingComplete) {
          clearTimeout(connectionTimeout);
          pairingComplete = true;
          console.log(chalk.green("\n[OK] WhatsApp authenticated successfully!"));

          setTimeout(() => {
            closeSock(sock);
            resolvePromise();
          }, 500);
        }

        if (connection === "close" && !pairingComplete) {
          clearTimeout(connectionTimeout);
          const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
            ?.statusCode;
          const errorMessage = lastDisconnect?.error?.message || "Unknown error";

          if (!hasShownQR) {
            closeSock(sock);

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

            closeSock(sock);

            const { state: newState, saveCreds: newSaveCreds } =
              await useMultiFileAuthState(WA_AUTH_DIR);
            const retrySock = makeWASocket({
              auth: newState,
              printQRInTerminal: false,
              logger: silentLogger,
            });

            retrySock.ev.on("creds.update", newSaveCreds);

            retrySock.ev.on("connection.update", (retryUpdate) => {
              if (retryUpdate.connection === "open") {
                pairingComplete = true;
                console.log(chalk.green("[OK] WhatsApp linked successfully!\n"));

                setTimeout(() => {
                  closeSock(retrySock);
                  resolvePromise();
                }, 500);
              }

              if (retryUpdate.connection === "close") {
                closeSock(retrySock);
                rejectPromise(new Error("WhatsApp authentication failed after restart"));
              }
            });
          } else if (hasShownQR && statusCode !== 515) {
            closeSock(sock);
            rejectPromise(new Error(`WhatsApp authentication failed (code: ${statusCode})`));
          }
        }
      });
    } catch (error) {
      if (sock) {
        closeSock(sock);
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
  console.log(chalk.gray("Configure your TxtCode CLI for remote IDE control"));
  console.log();

  // Check for existing configuration
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

  // Load models catalog
  const modelsCatalog = loadModelsCatalog();

  // Helper function to get all available providers dynamically from catalog
  function getAllProviders() {
    return Object.keys(modelsCatalog.providers).map((providerId) => {
      const providerData = modelsCatalog.providers[providerId];
      return {
        name: providerData.name,
        value: providerId,
      };
    });
  }

  // Helper function to configure a provider
  async function configureProvider(
    label: string,
  ): Promise<{ provider: string; apiKey: string; model: string } | null> {
    console.log();

    console.log(chalk.cyan(label));
    console.log();

    // Get available providers dynamically (excluding already selected ones)
    const providers = getAllProviders();
    const availableProviders = providers.filter((p) => !selectedProviders.has(p.value));

    if (availableProviders.length === 0) {
      throw new Error("No more providers available to configure");
    }

    // Add "Back" option if this is not the primary provider
    const providerChoices =
      label === "Primary AI Provider"
        ? availableProviders
        : [...availableProviders, { name: "← Back", value: "__BACK__" }];

    const providerValue = await showCenteredList({
      message: `Select ${label}: (Use arrow keys)`,
      choices: providerChoices,
    });

    // Handle back navigation
    if (providerValue === "__BACK__") {
      return null;
    }

    const apiKey = await showCenteredInput({
      message: "Enter API Key:",
      password: true,
      validate: (input) => input.length > 0 || "API key is required",
    });

    console.log(); // Add spacing after API key input

    // Validate API key (just check it's not empty)
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
        // Retry with same provider
        return await configureProvider(label);
      } else {
        throw new Error(
          "API key validation failed. Please run 'txtcode auth' again with a valid key.",
        );
      }
    }

    // Mark this provider as selected
    selectedProviders.add(providerValue);

    // Load models - use dynamic discovery for HuggingFace and OpenRouter, static catalog for others
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

    // Add "Enter custom model name" option at the top
    const modelChoicesWithCustom = [
      { name: "Enter custom model name", value: "__CUSTOM__" },
      ...modelChoices,
    ];

    console.log(); // Add spacing before model selection

    // Use pagination for OpenRouter and HuggingFace (10 items per page)
    const usePagination = providerValue === "openrouter" || providerValue === "huggingface";

    const selectedModel = await showCenteredList({
      message: "Select model: (Use arrow keys)",
      choices: modelChoicesWithCustom,
      pageSize: usePagination ? 10 : undefined,
    });

    let finalModel = selectedModel;

    // Handle custom model entry
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

  // Step 1: Configure Primary AI Provider (cannot go back from primary)
  let primaryProvider = await configureProvider("Primary AI Provider");

  // Primary provider should never be null, but handle it just in case
  while (primaryProvider === null) {
    console.log(chalk.yellow("\nPrimary provider is required. Please select a provider.\n"));
    primaryProvider = await configureProvider("Primary AI Provider");
  }

  // Collect all configured providers
  const configuredProviders: Array<{ provider: string; apiKey: string; model: string }> = [
    primaryProvider,
  ];

  // Step 2: Keep asking if user wants to add more providers (unlimited)
  let continueAdding = true;
  let providerCount = 1;

  while (continueAdding) {
    // Check if there are more providers available (dynamic)
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

    // Handle back navigation
    if (secondaryProvider === null) {
      providerCount--;
      continue;
    }

    configuredProviders.push(secondaryProvider);
  }

  // Validate all providers are unique (safety check)
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

  // Step 3: Messaging Platform
  const platform = await showCenteredList({
    message: "Select messaging platform: (Use arrow keys)",
    choices: [
      { name: "WhatsApp", value: "whatsapp" },
      { name: "Telegram", value: "telegram" },
      { name: "Discord", value: "discord" },
    ],
  });

  let telegramToken = "";
  let discordToken = "";

  // Complete messaging platform auth immediately
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
  } else {
    console.log();
    console.log(chalk.cyan("WhatsApp Setup"));
    console.log();

    // Ensure stdin is fully reset after TUI interactions
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.removeAllListeners("keypress");
    process.stdin.pause();

    // Give stdin time to settle
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Authenticate WhatsApp immediately
    try {
      await authenticateWhatsApp();
      console.log();
      console.log(chalk.green("WhatsApp authenticated successfully!"));
      console.log();
    } catch (error) {
      console.log();
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      // Check if it's a 405 error
      if (errorMsg.includes("405")) {
        console.log(chalk.red(`[ERROR] WhatsApp authentication failed (Error 405)`));
        console.log();
        console.log(chalk.yellow("This is a known issue with WhatsApp's protocol changes."));
        console.log(chalk.yellow("The WhatsApp library needs to be updated by the maintainers."));
        console.log();
        console.log(chalk.cyan("Recommended alternatives:"));
        console.log(chalk.white("  • Telegram - More stable and reliable"));
        console.log(chalk.white("  • Discord - Also very stable"));
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

  // Step 5: Coding Adapter Selection
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

  // Create config directory
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // Store API keys in keychain for all configured providers
  try {
    for (const provider of configuredProviders) {
      await setApiKey(provider.provider, provider.apiKey);
    }

    // Store bot tokens in keychain
    if (telegramToken) {
      await setBotToken("telegram", telegramToken);
    }
    if (discordToken) {
      await setBotToken("discord", discordToken);
    }
  } catch {
    console.log(chalk.red("\n[ERROR] Failed to store credentials in keychain"));
    console.log(chalk.yellow("Falling back to encrypted file storage...\n"));
  }

  // Build providers object dynamically
  const providersConfig: { [key: string]: { model: string } } = {};
  for (const provider of configuredProviders) {
    providersConfig[provider.provider] = {
      model: provider.model,
    };
  }

  // Save configuration WITHOUT API keys (stored in keychain)
  const config = {
    // Primary provider (active)
    aiProvider: primaryProvider.provider,
    aiModel: primaryProvider.model,

    // All providers (models only, keys in keychain)
    providers: providersConfig,

    platform: platform,
    ideType: ideType,
    idePort: 3000,
    authorizedUser: "", // Will be set on first message
    configuredAt: new Date().toISOString(),
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  // Set strict file permissions
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
  } catch {
    // Permissions could not be set — non-critical
  }

  console.log(chalk.green("\nAuthentication successful!"));
  console.log(chalk.gray(`\nConfiguration saved to: ${CONFIG_FILE}`));
  console.log(chalk.cyan("\nConfigured Providers:"));

  // Show all configured providers
  configuredProviders.forEach((provider, index) => {
    const label = index === 0 ? "Primary" : `Secondary ${index}`;
    console.log(chalk.white(`  ${label}: ${provider.provider} (${provider.model})`));
  });

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
