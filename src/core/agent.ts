import { logger } from "../shared/logger";
import { Message } from "../shared/types";
import { Router, AVAILABLE_ADAPTERS } from "./router";

export class AgentCore {
  private router: Router;
  private authorizedUser: string | null;
  private configPath: string;
  private userModes: Map<string, "chat" | "code"> = new Map();
  private pendingSwitch: Map<string, "main" | "adapter" | "provider" | "apikey"> = new Map();

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
    } catch (error) {
      // Config not found or invalid
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
      const fs = require("fs");
      const config = JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
      config.authorizedUser = userId;
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
    const currentProvider = this.router.getProviderName();
    const currentModel = this.router.getCurrentModel();

    this.pendingSwitch.set(userId, "provider");

    return `🤖 Switch Primary LLM

Current: ${currentProvider} (${currentModel})

1. Anthropic (Claude)
2. OpenAI (GPT)
3. Google Gemini
4. OpenRouter

Reply with a number (1-4) to switch:`;
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

    if (switchState === "apikey") {
      return await this.handleApiKeyInput(userId, text);
    }

    this.pendingSwitch.delete(userId);
    return `Invalid state. Please use /switch again.`;
  }

  private async handleProviderSelection(userId: string, text: string): Promise<string> {
    const selection = parseInt(text, 10);
    const providers = ["anthropic", "openai", "gemini", "openrouter"];

    if (isNaN(selection) || selection < 1 || selection > providers.length) {
      this.pendingSwitch.delete(userId);
      return `Invalid selection. Please use /switch again and pick a number between 1-4.`;
    }

    const selectedProvider = providers[selection - 1];
    const currentProvider = this.router.getProviderName();

    if (selectedProvider === currentProvider) {
      this.pendingSwitch.delete(userId);
      return `Already using ${selectedProvider}. No change needed.`;
    }

    // Store selected provider temporarily
    (this as any).tempProvider = selectedProvider;
    this.pendingSwitch.set(userId, "apikey");

    return `Please enter your API key for ${selectedProvider}:

(Your API key will be saved securely in ~/.txtcode/config.json)`;
  }

  private async handleApiKeyInput(userId: string, apiKey: string): Promise<string> {
    this.pendingSwitch.delete(userId);

    const selectedProvider = (this as any).tempProvider;
    delete (this as any).tempProvider;

    if (!apiKey || apiKey.trim().length === 0) {
      return `[ERROR] API key cannot be empty. Please use /switch again.`;
    }

    try {
      // Update config file
      const fs = require("fs");
      const config = JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
      config.aiProvider = selectedProvider;
      config.aiApiKey = apiKey.trim();
      config.updatedAt = new Date().toISOString();

      // Load models catalog to get default model
      const modelsCatalog = require("../../data/models-catalog.json");
      const providerModels = modelsCatalog.providers[selectedProvider];
      const defaultModel = providerModels.models.find((m: any) => m.recommended)?.id || providerModels.models[0]?.id;
      
      if (defaultModel) {
        config.aiModel = defaultModel;
      }

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));

      // Update router
      this.router.updateProvider(selectedProvider, apiKey.trim(), defaultModel || "");

      return `✅ Primary LLM switched!

Provider: ${selectedProvider}
Model: ${defaultModel || "default"}

Your chat messages will now use ${selectedProvider}.`;
    } catch (error) {
      return `[ERROR] Failed to update provider: ${error instanceof Error ? error.message : "Unknown error"}`;
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
