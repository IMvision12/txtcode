import { logger } from "../shared/logger";
import { Message } from "../shared/types";
import { getApiKey } from "../utils/keychain";
import { Router } from "./router";

export class AgentCore {
  private router: Router;
  private authorizedUser: string | null;
  private configPath: string;
  private userModes: Map<string, "chat" | "code"> = new Map();
  private pendingSwitch: Map<
    string,
    "main" | "adapter" | "provider" | "cli-model" | "cli-model-custom"
  > = new Map();

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

  private loadConfigSafely(): Record<string, unknown> | null {
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

  shouldStream(userId: string, text: string): boolean {
    const lower = text.trim().toLowerCase();
    if (
      lower === "/code" ||
      lower === "/chat" ||
      lower === "/switch" ||
      lower === "/cancel" ||
      lower === "/cli-model" ||
      lower === "help" ||
      lower === "/help" ||
      lower === "status" ||
      lower === "/status"
    ) {
      return false;
    }
    if (this.pendingSwitch.has(userId)) {
      return false;
    }
    return this.userModes.get(userId) === "code";
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

    if (lowerText === "/cancel") {
      this.router.abortCurrentCommand();
      return "Current command cancelled.";
    }

    if (lowerText === "/cli-model") {
      return this.showCliModelMenu(message.from);
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

    const configuredProviders = (config.providers || {}) as Record<string, { model: string }>;
    const allProviders = Object.keys(configuredProviders);

    const validProviders = allProviders.filter((provider) => {
      const providerConfig = configuredProviders[provider];
      return providerConfig && providerConfig.model;
    });

    if (validProviders.length === 0) {
      return `[ERROR] No valid providers configured. Please run 'txtcode auth' to configure providers.`;
    }

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

    if (switchState === "cli-model") {
      return this.handleCliModelSelection(userId, text);
    }

    if (switchState === "cli-model-custom") {
      this.pendingSwitch.delete(userId);
      const customModel = text.trim();
      if (!customModel) {
        return `No model name provided. Use /cli-model to try again.`;
      }
      const adapterName = this.router.getAdapterName();
      this.router.setAdapterModel(customModel);
      this.persistAdapterModel(adapterName, customModel);
      return `✅ Model switched!\n\nAdapter: ${adapterName}\nModel: ${customModel} (custom)`;
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

    const configuredProviders = (config.providers || {}) as Record<string, { model: string }>;
    const allProviders = Object.keys(configuredProviders);

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
    } catch (error: unknown) {
      return `[ERROR] Failed to switch provider: ${error instanceof Error ? error.message : String(error)}`;
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

  private showCliModelMenu(userId: string): string {
    const adapterName = this.router.getAdapterName();
    const currentModel = this.router.getAdapterCurrentModel();
    const models = this.router.getAdapterModels();

    let response = `🔧 CLI Model Selection (${adapterName})\n\nCurrent model: ${currentModel}\n\n`;

    if (models.length === 0) {
      response += `No predefined models available for this adapter.\n\n`;
      response += `0. Enter custom model name\n`;
    } else {
      models.forEach((model, index) => {
        const isCurrent = model.id === currentModel;
        const marker = isCurrent ? " ✓" : "";
        response += `${index + 1}. ${model.name} (${model.id})${marker}\n`;
      });
      response += `\n0. Enter custom model name\n`;
    }

    response += `\nReply with a number to select, or 0 for custom:`;
    this.pendingSwitch.set(userId, "cli-model");
    return response;
  }

  private handleCliModelSelection(userId: string, text: string): string {
    this.pendingSwitch.delete(userId);
    const adapterName = this.router.getAdapterName();

    if (text.trim() === "0") {
      this.pendingSwitch.set(userId, "cli-model-custom");
      return `Enter the model name to use with ${adapterName}:`;
    }

    const models = this.router.getAdapterModels();
    const selection = parseInt(text, 10);

    if (models.length > 0 && !isNaN(selection) && selection >= 1 && selection <= models.length) {
      const selected = models[selection - 1];
      this.router.setAdapterModel(selected.id);
      this.persistAdapterModel(adapterName, selected.id);
      return `✅ Model switched!\n\nAdapter: ${adapterName}\nModel: ${selected.name} (${selected.id})`;
    }

    // Treat as custom model name if not a valid number
    const customModel = text.trim();
    if (customModel) {
      this.router.setAdapterModel(customModel);
      this.persistAdapterModel(adapterName, customModel);
      return `✅ Model switched!\n\nAdapter: ${adapterName}\nModel: ${customModel} (custom)`;
    }

    return `Invalid selection. Use /cli-model to try again.`;
  }

  private persistAdapterModel(adapterName: string, modelId: string): void {
    try {
      const config = this.loadConfigSafely();
      if (!config) {
        return;
      }

      if (!config.adapterModels) {
        config.adapterModels = {} as Record<string, string>;
      }
      (config.adapterModels as Record<string, string>)[adapterName] = modelId;
      config.updatedAt = new Date().toISOString();

      const fs = require("fs");
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      logger.debug(`Persisted model ${modelId} for adapter ${adapterName}`);
    } catch (error) {
      logger.error("Failed to persist adapter model", error);
    }
  }

  private getHelpMessage(): string {
    return `TxtCode Agent

Commands:
/code - Switch to CODE mode (messages go to coding adapter)
/chat - Switch to CHAT mode (messages go to primary LLM)
/cancel - Cancel the current running command
/switch - Switch Primary LLM or Coding Adapter
/cli-model - Change the model used by the current coding adapter
/status - Check IDE connection
/help - Show this message

Chat Mode (default):
Messages go to ${this.router.getProviderName()} with tool support.

Code Mode:
Messages go to ${this.router.getAdapterName()}.
Sending a new message while one is running will cancel the previous one.`;
  }
}
