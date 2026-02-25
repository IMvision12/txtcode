import { logger } from "../shared/logger";
import { Message } from "../shared/types";
import { getApiKey } from "../utils/keychain";
import { Router, AVAILABLE_ADAPTERS } from "./router";

export class AgentCore {
  private router: Router;
  private authorizedUser: string | null;
  private configPath: string;
  private userModes: Map<string, "chat" | "code"> = new Map();
  private pendingSwitch: Map<string, "main" | "adapter" | "provider"> = new Map();

  constructor() {
    this.router = new Router();
    this.authorizedUser = null;
    this.configPath = require("path").join(require("os").homedir(), ".txtcode", "config.json");
    this.loadAuthorizedUser();
  }

  private loadAuthorizedUser() {
    try {
      const fs = require("fs");
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
        this.authorizedUser = config.authorizedUser || null;
      }
    } catch {
      // Config not found or invalid
    }
  }

  private loadConfigSafely(): any | null {
    try {
      const fs = require("fs");
      if (!fs.existsSync(this.configPath)) {
        return null;
      }
      const configData = fs.readFileSync(this.configPath, "utf-8");
      const config = JSON.parse(configData);

      // Note: If user manually edits config with duplicate provider keys,
      // JSON.parse automatically deduplicates (last key wins).
      // This is safe JavaScript behavior.

      return config;
    } catch (error) {
      logger.error("Failed to load config file", error);
      return null;
    }
  }

  isUserInCodeMode(userId: string): boolean {
    return this.userModes.get(userId) === "code";
  }

  isPendingSwitch(userId: string): boolean {
    return this.pendingSwitch.has(userId);
  }

  private saveAuthorizedUser(userId: string) {
    try {
      const config = this.loadConfigSafely();

      if (!config) {
        logger.error("Failed to load config file to save authorized user");
        return;
      }

      config.authorizedUser = userId;

      const fs = require("fs");
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      this.authorizedUser = userId;
    } catch (error) {
      logger.error("Failed to save authorized user", error);
    }
  }

  isUserAllowed(userId: string): boolean {
    if (!this.authorizedUser) {
      logger.debug(`Authorizing first user: ${userId}`);
      this.saveAuthorizedUser(userId);
      return true;
    }

    if (this.authorizedUser === userId) {
      return true;
    }

    logger.debug(`Rejected unauthorized user: ${userId} (authorized: ${this.authorizedUser})`);
    return false;
  }

  async processMessage(message: Message, onProgress?: (chunk: string) => void): Promise<string> {
    if (!this.isUserAllowed(message.from)) {
      return "[UNAUTHORIZED]";
    }

    const text = message.text.trim();
    const lowerText = text.toLowerCase();

    // Check if user is responding to a pending /switch selection
    if (this.pendingSwitch.get(message.from)) {
      return await this.handleSwitchSelection(message.from, text);
    }

    if (lowerText === "/code") {
      this.userModes.set(message.from, "code");
      return `[CODE MODE] Switched to CODE mode

All your messages will now be sent to the coding adapter (${this.router.getAdapterName()}).

To switch back to chat mode, use: /chat`;
    }

    if (lowerText === "/chat") {
      this.userModes.set(message.from, "chat");
      return `[CHAT MODE] Switched to CHAT mode

All your messages will now be sent to the primary LLM (${this.router.getProviderName()}).

To switch to code mode, use: /code`;
    }

    if (lowerText === "/switch") {
      return this.showSwitchMainMenu(message.from);
    }

    if (lowerText === "help" || lowerText === "/help") {
      return this.getHelpMessage();
    }

    if (lowerText === "status" || lowerText === "/status") {
      return await this.router.getAdapterStatus();
    }

    const userMode = this.userModes.get(message.from);

    if (userMode === "code") {
      logger.debug("Routing to coding adapter (CODE mode)...");

      // Abort any previous command when new message arrives
      this.router.abortCurrentCommand();

      try {
        return await this.router.routeToCode(text, onProgress);
      } catch (error) {
        if (error instanceof Error && error.message.includes("aborted")) {
          return "[ABORTED] Previous command was cancelled. Processing new request...";
        }
        return `[ERROR] ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    } else {
      logger.debug("Routing to primary LLM (CHAT mode)...");
      try {
        return await this.router.routeToChat(text);
      } catch (error) {
        return `[ERROR] ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    }
  }

  private showSwitchMainMenu(userId: string): string {
    this.pendingSwitch.set(userId, "main");

    return `🔄 Switch Configuration

What would you like to switch?

1. Primary LLM (Chat Mode)
2. Coding Adaptor (Code Mode)

Reply with 1 or 2:`;
  }

  private showProviderList(userId: string): string {
    const config = this.loadConfigSafely();

    if (!config) {
      return `[ERROR] Failed to load configuration. Config file may be corrupted.\n\nPlease run 'txtcode auth' to reconfigure.`;
    }

    const currentProvider = this.router.getProviderName();
    const currentModel = this.router.getCurrentModel();

    // Get configured providers and validate them
    const configuredProviders = config.providers || {};
    const allProviders = Object.keys(configuredProviders);

    // Filter out providers with invalid configurations
    const validProviders = allProviders.filter((provider) => {
      const providerConfig = configuredProviders[provider];
      return providerConfig && providerConfig.model;
    });

    if (validProviders.length === 0) {
      return `[ERROR] No valid providers configured. Please run 'txtcode auth' to configure providers.`;
    }

    // Warn if some providers were filtered out
    if (validProviders.length < allProviders.length) {
      const invalidCount = allProviders.length - validProviders.length;
      logger.debug(`${invalidCount} provider(s) have invalid configuration and were excluded`);
    }

    this.pendingSwitch.set(userId, "provider");

    let response = `🤖 Switch Primary LLM\n\nCurrent: ${currentProvider} (${currentModel})\n\nConfigured Providers:\n`;

    validProviders.forEach((provider, index) => {
      const providerConfig = configuredProviders[provider];
      const isCurrent = provider === currentProvider;
      const marker = isCurrent ? " ✓" : "";
      response += `${index + 1}. ${provider} (${providerConfig.model})${marker}\n`;
    });

    response += `\nReply with a number (1-${validProviders.length}) to switch:`;

    return response;
  }

  private showAdapterList(userId: string): string {
    const adapters = this.router.getAvailableAdapters();
    const currentAdapter = this.router.getAdapterName();

    let response = `🔄 Switch Coding Adapter\n\nCurrent: ${currentAdapter}\n\n`;

    adapters.forEach((adapter, index) => {
      const isCurrent = adapter.id === currentAdapter;
      const marker = isCurrent ? " ✓" : "";
      response += `${index + 1}. ${adapter.label}${marker}\n`;
    });

    response += `\nReply with a number (1-${adapters.length}) to switch:`;

    this.pendingSwitch.set(userId, "adapter");

    return response;
  }

  private async handleSwitchSelection(userId: string, text: string): Promise<string> {
    const switchState = this.pendingSwitch.get(userId);

    if (switchState === "main") {
      const selection = parseInt(text, 10);

      if (selection === 1) {
        return this.showProviderList(userId);
      } else if (selection === 2) {
        return this.showAdapterList(userId);
      } else {
        this.pendingSwitch.delete(userId);
        return `Invalid selection. Please use /switch again and choose 1 or 2.`;
      }
    }

    if (switchState === "provider") {
      return await this.handleProviderSelection(userId, text);
    }

    if (switchState === "adapter") {
      return await this.handleAdapterSelection(userId, text);
    }

    this.pendingSwitch.delete(userId);
    return `Invalid state. Please use /switch again.`;
  }

  private async handleProviderSelection(userId: string, text: string): Promise<string> {
    this.pendingSwitch.delete(userId);

    const config = this.loadConfigSafely();

    if (!config) {
      return `[ERROR] Failed to load configuration. Config file may be corrupted.\n\nPlease run 'txtcode auth' to reconfigure.`;
    }

    const configuredProviders = config.providers || {};
    const allProviders = Object.keys(configuredProviders);

    // Filter out providers with invalid configurations (same as showProviderList)
    const validProviders = allProviders.filter((provider) => {
      const providerConfig = configuredProviders[provider];
      return providerConfig && providerConfig.model;
    });

    const selection = parseInt(text, 10);
    if (isNaN(selection) || selection < 1 || selection > validProviders.length) {
      return `Invalid selection. Please use /switch again and pick a number between 1-${validProviders.length}.`;
    }

    const selectedProvider = validProviders[selection - 1];
    const currentProvider = this.router.getProviderName();

    if (selectedProvider === currentProvider) {
      return `Already using ${selectedProvider}. No change needed.`;
    }

    const providerConfig = configuredProviders[selectedProvider];

    // Validate provider configuration (redundant check for safety)
    if (!providerConfig || !providerConfig.model) {
      return `[ERROR] Provider configuration for ${selectedProvider} is invalid.\n\nPlease run 'txtcode auth' to reconfigure.`;
    }

    try {
      // Retrieve API key from keychain
      const apiKey = await getApiKey(selectedProvider);
      if (!apiKey) {
        return `[ERROR] Failed to retrieve API key for ${selectedProvider} from keychain. Please run 'txtcode auth' to reconfigure.`;
      }

      // Update config file with new active provider
      config.aiProvider = selectedProvider;
      config.aiModel = providerConfig.model;
      config.updatedAt = new Date().toISOString();

      const fs = require("fs");
      try {
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      } catch (writeError) {
        return `[ERROR] Failed to save configuration: ${writeError instanceof Error ? writeError.message : "Unknown error"}`;
      }

      // Update router
      this.router.updateProvider(selectedProvider, apiKey, providerConfig.model);

      return `✅ Primary LLM switched!

Provider: ${selectedProvider}
Model: ${providerConfig.model}

Your chat messages will now use ${selectedProvider}.`;
    } catch (error: any) {
      return `[ERROR] Failed to switch provider: ${error.message}`;
    }
  }

  private async handleAdapterSelection(userId: string, text: string): Promise<string> {
    this.pendingSwitch.delete(userId);

    const adapters = this.router.getAvailableAdapters();
    const selection = parseInt(text, 10);

    if (isNaN(selection) || selection < 1 || selection > adapters.length) {
      return `Invalid selection. Please use /switch again and pick a number between 1-${adapters.length}.`;
    }

    const selectedAdapter = adapters[selection - 1];
    const currentAdapter = this.router.getAdapterName();

    if (selectedAdapter.id === currentAdapter) {
      return `Already using ${selectedAdapter.label}. No change needed.`;
    }

    try {
      const { handoffGenerated, oldAdapter, entryCount } = await this.router.switchAdapter(
        selectedAdapter.id,
      );

      let response = `✅ Adapter switched!\n\n`;
      response += `${oldAdapter} → ${selectedAdapter.id}\n`;

      if (handoffGenerated) {
        response += `\n📋 Context saved & transferred (${entryCount} exchanges)\n`;
        response += `Session persisted to ~/.txtcode/sessions/\n`;
        response += `Your next /code message will have full context from the previous adapter.`;
      } else {
        response += `\nNo prior context to transfer (fresh session).`;
      }

      return response;
    } catch (error) {
      return `[ERROR] Failed to switch adapter: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }

  private getHelpMessage(): string {
    return `TxtCode Agent

Available commands:
• help - Show this message
• status - Check IDE connection
• /code - Switch to CODE mode (all messages go to coding adapter)
• /chat - Switch to CHAT mode (all messages go to primary LLM)
• /switch - Switch Primary LLM or Coding Adaptor

Chat Mode (default):
Messages go to the primary LLM (${this.router.getProviderName()}) with terminal tool support.

Code Mode:
Messages go to the coding adapter (${this.router.getAdapterName()})

To switch configurations:
Use /switch to choose between:
1. Primary LLM (for chat mode) - includes API key configuration
2. Coding Adaptor (for code mode) - switches IDE adapter`;
  }
}
