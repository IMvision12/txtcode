import fs from "fs";
import os from "os";
import path from "path";
import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";
import chalk from "chalk";
import inquirer from "inquirer";
import qrcode from "qrcode-terminal";
import { discoverHuggingFaceModels, discoverOpenRouterModels } from "../../utils/model-discovery-util";
import { loadModelsCatalog } from "../../utils/models-catalog-loader";
import { setApiKey, setBotToken, isKeychainAvailable } from "../../utils/keychain";

const CONFIG_DIR = path.join(os.homedir(), ".txtcode");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const WA_AUTH_DIR = path.join(CONFIG_DIR, ".wacli_auth");

// Validate API key
function validateApiKeyFormat(apiKey: string): { valid: boolean; error?: string } {
  const trimmed = apiKey.trim();
  
  if (!trimmed) {
    return { valid: false, error: "API key is required" };
  }
  
  return { valid: true };
}

async function authenticateWhatsApp(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let sock: any = null;
    let pairingComplete = false;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(WA_AUTH_DIR);

      sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: {
          level: "silent",
          fatal: () => {},
          error: () => {},
          warn: () => {},
          info: () => {},
          debug: () => {},
          trace: () => {},
          child: () => ({
            level: "silent",
            fatal: () => {},
            error: () => {},
            warn: () => {},
            info: () => {},
            debug: () => {},
            trace: () => {},
          }),
        } as any,
      });

      let hasShownQR = false;

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async (update: any) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr && !hasShownQR) {
          hasShownQR = true;
          console.log(chalk.yellow("\n[QR] Scan this QR code with WhatsApp:\n"));
          qrcode.generate(qr, { small: true });
          console.log(chalk.gray("\nOpen WhatsApp → Settings → Linked Devices → Link a Device\n"));
        }

        if (connection === "open" && !pairingComplete) {
          pairingComplete = true;
          console.log(chalk.green("\n[OK] WhatsApp authenticated successfully!"));

          // Close socket and resolve
          setTimeout(() => {
            try {
              sock.ws?.close();
            } catch (e) {
              // Ignore
            }
            resolve();
          }, 500);
        }

        if (connection === "close" && !pairingComplete) {
          const statusCode = lastDisconnect?.error?.output?.statusCode;

          // 515 means pairing successful but needs restart - OpenClaw pattern
          if (statusCode === 515 && hasShownQR) {
            console.log(
              chalk.cyan("\n[INFO] WhatsApp pairing complete, restarting connection...\n"),
            );

            try {
              sock.ws?.close();
            } catch (e) {
              // Ignore
            }

            // Restart connection without QR
            const { state: newState, saveCreds: newSaveCreds } =
              await useMultiFileAuthState(WA_AUTH_DIR);
            const retrySock = makeWASocket({
              auth: newState,
              printQRInTerminal: false,
              logger: {
                level: "silent",
                fatal: () => {},
                error: () => {},
                warn: () => {},
                info: () => {},
                debug: () => {},
                trace: () => {},
                child: () => ({
                  level: "silent",
                  fatal: () => {},
                  error: () => {},
                  warn: () => {},
                  info: () => {},
                  debug: () => {},
                  trace: () => {},
                }),
              } as any,
            });

            retrySock.ev.on("creds.update", newSaveCreds);

            retrySock.ev.on("connection.update", async (retryUpdate: any) => {
              if (retryUpdate.connection === "open") {
                pairingComplete = true;
                console.log(chalk.green("[OK] WhatsApp linked successfully!\n"));

                // Close and resolve
                setTimeout(() => {
                  try {
                    retrySock.ws?.close();
                  } catch (e) {
                    // Ignore
                  }
                  resolve();
                }, 500);
              }

              if (retryUpdate.connection === "close") {
                try {
                  retrySock.ws?.close();
                } catch (e) {
                  // Ignore
                }
                reject(new Error("WhatsApp authentication failed after restart"));
              }
            });
          } else if (hasShownQR && statusCode !== 515) {
            // Other errors after showing QR
            try {
              sock.ws?.close();
            } catch (e) {
              // Ignore
            }
            reject(new Error(`WhatsApp authentication failed (code: ${statusCode})`));
          }
        }
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        if (!pairingComplete) {
          try {
            sock.ws?.close();
          } catch (e) {
            // Ignore
          }
          reject(new Error("WhatsApp authentication timeout"));
        }
      }, 120000);
    } catch (error) {
      if (sock) {
        try {
          sock.ws?.close();
        } catch (e) {
          // Ignore
        }
      }
      reject(error);
    }
  });
}

export async function authCommand() {
  console.log(chalk.blue.bold("\nTxtCode Authentication\n"));
  console.log(chalk.gray("Configure your TxtCode CLI for remote IDE control\n"));

  // Check for existing configuration
  const existingConfig = loadConfig();
  if (existingConfig && existingConfig.providers) {
    console.log(chalk.yellow("⚠️  Existing configuration detected!\n"));
    console.log(chalk.gray("Currently configured providers:"));
    Object.keys(existingConfig.providers).forEach(provider => {
      const providerConfig = existingConfig.providers[provider];
      console.log(chalk.white(`  • ${provider} (${providerConfig.model})`));
    });
    console.log();

    const { shouldOverwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldOverwrite",
        message: "Do you want to reconfigure? This will overwrite existing providers.",
        default: false,
      },
    ]);

    if (!shouldOverwrite) {
      console.log(chalk.gray("\nAuthentication cancelled. Use 'txtcode config' to modify individual settings.\n"));
      return;
    }
    console.log(chalk.yellow("\nReconfiguring all providers...\n"));
  }

  const selectedProviders = new Set<string>();

  // Load models catalog
  const modelsCatalog = loadModelsCatalog();

  // Helper function to get all available providers dynamically from catalog
  function getAllProviders() {
    return Object.keys(modelsCatalog.providers).map(providerId => {
      const providerData = modelsCatalog.providers[providerId];
      return {
        name: providerData.name,
        value: providerId,
      };
    });
  }

  // Helper function to configure a provider
  async function configureProvider(label: string, existingProvider?: string): Promise<{provider: string; apiKey: string; model: string} | null> {
    console.log(chalk.cyan(`\n${label}\n`));
    
    // Get available providers dynamically (excluding already selected ones)
    const allProviders = getAllProviders();
    const availableProviders = allProviders.filter(p => !selectedProviders.has(p.value));
    
    if (availableProviders.length === 0) {
      throw new Error("No more providers available to configure");
    }
    
    // Add "Back" option if this is not the primary provider
    const providerChoices = label === "Primary AI Provider" 
      ? availableProviders 
      : [...availableProviders, { name: "← Back", value: "__BACK__" }];
    
    const providerAnswers = await inquirer.prompt([
      {
        type: "list",
        name: "provider",
        message: `Select ${label.toLowerCase()}:`,
        choices: providerChoices,
        pageSize: 20,
      },
    ]);
    
    // Handle back navigation
    if (providerAnswers.provider === "__BACK__") {
      return null;
    }
    
    const apiKeyAnswer = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: "Enter API Key:",
        mask: "*",
        validate: (input) => input.length > 0 || "API key is required",
      },
    ]);
    
    providerAnswers.apiKey = apiKeyAnswer.apiKey;

    // Validate API key (just check it's not empty)
    const validation = validateApiKeyFormat(providerAnswers.apiKey);
    
    if (!validation.valid) {
      console.log(chalk.red(`\n[ERROR] ${validation.error}\n`));
      
      const { retry } = await inquirer.prompt([
        {
          type: "confirm",
          name: "retry",
          message: "Would you like to enter a different API key?",
          default: true,
        },
      ]);
      
      if (retry) {
        // Retry with same provider
        return await configureProvider(label, existingProvider);
      } else {
        throw new Error("API key validation failed. Please run 'txtcode auth' again with a valid key.");
      }
    }

    // Mark this provider as selected
    selectedProviders.add(providerAnswers.provider);

    // Load models - use dynamic discovery for HuggingFace and OpenRouter, static catalog for others
    let modelChoices: Array<{ name: string; value: string }>;
    
    if (providerAnswers.provider === "huggingface") {
      console.log(chalk.gray("Discovering available models from HuggingFace..."));
      try {
        const discoveredModels = await discoverHuggingFaceModels(providerAnswers.apiKey);
        modelChoices = discoveredModels.map((model) => ({
          name: model.description ? `${model.name} - ${model.description}` : model.name,
          value: model.id,
        }));
        console.log(chalk.green(`Found ${discoveredModels.length} models\n`));
      } catch (error) {
        console.log(chalk.red(`\n[ERROR] Failed to discover HuggingFace models: ${error instanceof Error ? error.message : "Unknown error"}\n`));
        console.log(chalk.yellow("Please check your API key and try again.\n"));
        
        const { retry } = await inquirer.prompt([
          {
            type: "confirm",
            name: "retry",
            message: "Would you like to enter a different API key?",
            default: true,
          },
        ]);
        
        if (retry) {
          return await configureProvider(label, existingProvider);
        } else {
          throw new Error("HuggingFace model discovery failed. Please run 'txtcode auth' again with a valid API key.");
        }
      }
    } else if (providerAnswers.provider === "openrouter") {
      console.log(chalk.gray("Discovering available models from OpenRouter..."));
      try {
        const discoveredModels = await discoverOpenRouterModels(providerAnswers.apiKey);
        modelChoices = discoveredModels.map((model) => ({
          name: model.description ? `${model.name} - ${model.description}` : model.name,
          value: model.id,
        }));
        console.log(chalk.green(`Found ${discoveredModels.length} models\n`));
      } catch (error) {
        console.log(chalk.red(`\n[ERROR] Failed to discover OpenRouter models: ${error instanceof Error ? error.message : "Unknown error"}\n`));
        console.log(chalk.yellow("Please check your API key and try again.\n"));
        
        const { retry } = await inquirer.prompt([
          {
            type: "confirm",
            name: "retry",
            message: "Would you like to enter a different API key?",
            default: true,
          },
        ]);
        
        if (retry) {
          return await configureProvider(label, existingProvider);
        } else {
          throw new Error("OpenRouter model discovery failed. Please run 'txtcode auth' again with a valid API key.");
        }
      }
    } else {
      const providerModels = modelsCatalog.providers[providerAnswers.provider];
      modelChoices = providerModels.models.map((model: any) => ({
        name: model.recommended
          ? `${model.name} - Recommended`
          : model.name,
        value: model.id,
      }));
    }

    // Add "Enter custom model name" option at the top
    const modelChoicesWithCustom = [
      { name: "✏️  Enter custom model name", value: "__CUSTOM__" },
      ...modelChoices,
    ];

    const modelAnswer = await inquirer.prompt([
      {
        type: "list",
        name: "model",
        message: "Select model:",
        choices: modelChoicesWithCustom,
        default: modelChoicesWithCustom[1]?.value, // Default to first real model, not custom
        pageSize: 20,
      },
    ]);

    let selectedModel = modelAnswer.model;

    // Handle custom model entry
    if (selectedModel === "__CUSTOM__") {
      const customModelAnswer = await inquirer.prompt([
        {
          type: "input",
          name: "customModel",
          message: "Enter model name/ID:",
          validate: (input) => input.trim().length > 0 || "Model name is required",
        },
      ]);
      selectedModel = customModelAnswer.customModel.trim();
      console.log(chalk.gray(`Using custom model: ${selectedModel}\n`));
    }

    console.log(chalk.green(`\n${label} configured: ${providerAnswers.provider} (${selectedModel})\n`));

    return {
      provider: providerAnswers.provider,
      apiKey: providerAnswers.apiKey,
      model: selectedModel,
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
  const configuredProviders: Array<{provider: string; apiKey: string; model: string}> = [primaryProvider];

  // Step 2: Keep asking if user wants to add more providers (unlimited)
  let continueAdding = true;
  let providerCount = 1;

  while (continueAdding) {
    // Check if there are more providers available (dynamic)
    const allProviders = getAllProviders();
    const remainingProviders = allProviders.filter(p => !selectedProviders.has(p.value));
    
    if (remainingProviders.length === 0) {
      console.log(chalk.yellow(`\n✓ All available providers configured (${providerCount} total)\n`));
      break;
    }

    const { addMore } = await inquirer.prompt([
      {
        type: "confirm",
        name: "addMore",
        message: `Add another provider for hot-switching? (${providerCount} configured, ${remainingProviders.length} available)`,
        default: providerCount === 1, // Default to yes for first secondary provider
      },
    ]);

    if (!addMore) {
      continueAdding = false;
      break;
    }

    providerCount++;
    const secondaryProvider = await configureProvider(`Secondary AI Provider #${providerCount - 1}`);
    
    // Handle back navigation
    if (secondaryProvider === null) {
      providerCount--;
      continue;
    }
    
    configuredProviders.push(secondaryProvider);
  }

  // Validate all providers are unique (safety check)
  const allProviderNames = configuredProviders.map(p => p.provider);
  const uniqueProviders = new Set(allProviderNames);
  
  if (uniqueProviders.size !== allProviderNames.length) {
    console.log(chalk.red("\n[ERROR] Duplicate providers detected. Each provider must be unique.\n"));
    console.log(chalk.yellow("Please run 'txtcode auth' again and select different providers.\n"));
    process.exit(1);
  }

  console.log(chalk.green(`\n✅ Configured ${configuredProviders.length} provider(s)\n`));

  // Step 3: Messaging Platform
  const platformAnswers = await inquirer.prompt([
    {
      type: "list",
      name: "platform",
      message: "Select messaging platform:",
      choices: [
        { name: "WhatsApp", value: "whatsapp" },
        { name: "Telegram", value: "telegram" },
        { name: "Discord", value: "discord" },
      ],
      default: "whatsapp",
    },
  ]);

  let telegramToken = "";
  let discordToken = "";

  // Complete messaging platform auth immediately
  if (platformAnswers.platform === "telegram") {
    console.log(chalk.cyan("\nTelegram Bot Setup\n"));
    console.log(chalk.gray("1. Open Telegram and search for @BotFather"));
    console.log(chalk.gray("2. Send /newbot and follow the instructions"));
    console.log(chalk.gray("3. Copy the bot token you receive\n"));

    const telegramAnswers = await inquirer.prompt([
      {
        type: "password",
        name: "token",
        message: "Enter Telegram Bot Token:",
        mask: "*",
        validate: (input) => input.length > 0 || "Token is required",
      },
    ]);

    telegramToken = telegramAnswers.token;
    console.log(chalk.green("\nTelegram bot configured\n"));
  } else if (platformAnswers.platform === "discord") {
    console.log(chalk.cyan("\nDiscord Bot Setup\n"));
    console.log(chalk.gray("1. Go to https://discord.com/developers/applications"));
    console.log(chalk.gray("2. Create a New Application"));
    console.log(chalk.gray("3. Go to Bot → Add Bot"));
    console.log(chalk.gray("4. Copy the bot token"));
    console.log(chalk.gray("5. Enable MESSAGE CONTENT INTENT\n"));

    const discordAnswers = await inquirer.prompt([
      {
        type: "password",
        name: "token",
        message: "Enter Discord Bot Token:",
        mask: "*",
        validate: (input) => input.length > 0 || "Token is required",
      },
    ]);

    discordToken = discordAnswers.token;
    console.log(chalk.green("\nDiscord bot configured\n"));
  } else {
    console.log(chalk.cyan("\nWhatsApp Setup\n"));

    // Authenticate WhatsApp immediately
    console.log(chalk.cyan("Authenticating WhatsApp...\n"));
    await authenticateWhatsApp();
    console.log(chalk.green("\nWhatsApp authenticated successfully!\n"));
  }

  // Step 5: Coding Adapter Selection
  const ideAnswers = await inquirer.prompt([
    {
      type: "list",
      name: "ideType",
      message: "Select coding adapter:",
      choices: [
        { name: "Claude Code (Anthropic)", value: "claude-code" },
        { name: "Cursor CLI (Headless)", value: "cursor" },
        { name: "OpenAI Codex (OpenAI)", value: "codex" },
        { name: "Gemini CLI (Google)", value: "gemini-code" },
        { name: "Kiro CLI (AWS)", value: "kiro" },
        { name: "Ollama Claude Code (Local, Free)", value: "ollama-claude-code" },
      ],
    },
  ]);

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
  } catch (error) {
    console.log(chalk.red("\n[ERROR] Failed to store credentials in keychain"));
    console.log(chalk.yellow("Falling back to encrypted file storage...\n"));
    // Continue with file storage as fallback
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
    
    platform: platformAnswers.platform,
    ideType: ideAnswers.ideType,
    idePort: 3000,
    authorizedUser: "", // Will be set on first message
    configuredAt: new Date().toISOString(),
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  
  // Set strict file permissions
  try {
    fs.chmodSync(CONFIG_DIR, 0o700);
    fs.chmodSync(CONFIG_FILE, 0o600);
  } catch (error) {
    // Windows doesn't support chmod, will use icacls in security-check
  }

  console.log(chalk.green("\nAuthentication successful!"));
  console.log(chalk.gray(`\nConfiguration saved to: ${CONFIG_FILE}`));
  console.log(chalk.cyan("\nConfigured Providers:"));
  
  // Show all configured providers
  configuredProviders.forEach((provider, index) => {
    const label = index === 0 ? "Primary" : `Secondary ${index}`;
    console.log(chalk.white(`  ${label}: ${provider.provider} (${provider.model})`));
  });
  
  console.log(chalk.cyan("\nNext steps:"));
  console.log(chalk.white("  1. Run: " + chalk.bold("txtcode start")));

  if (platformAnswers.platform === "telegram") {
    console.log(chalk.white("  2. Message your Telegram bot"));
  } else if (platformAnswers.platform === "discord") {
    console.log(chalk.white("  2. Invite bot to your server and mention it"));
  } else if (platformAnswers.platform === "whatsapp") {
    console.log(chalk.white("  2. Send a message from your authorized number"));
  }

  console.log(chalk.white("  3. Start coding from your phone!\n"));
  
  if (configuredProviders.length > 1) {
    console.log(chalk.gray("  Use /switch to change between your configured providers\n"));
  } else {
    console.log(chalk.gray("  Tip: Run 'txtcode auth' again to add more providers for /switch\n"));
  }

  // Force exit to ensure terminal closes (WhatsApp socket may have lingering listeners)
  setTimeout(() => {
    process.exit(0);
  }, 100);
}

export function loadConfig(): any {
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }

  try {
    const data = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}
