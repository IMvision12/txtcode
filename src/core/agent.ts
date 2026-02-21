import { logger } from "../shared/logger";
import { Message } from "../shared/types";
import { Router, AVAILABLE_ADAPTERS } from "./router";

export class AgentCore {
  private router: Router;
  private authorizedUser: string | null;
  private configPath: string;
  private userModes: Map<string, "chat" | "code"> = new Map();
  private pendingSwitch: Map<string, boolean> = new Map();

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

  async processMessage(message: Message): Promise<string> {
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
      return this.showAdapterList(message.from);
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
        return await this.router.routeToCode(text);
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

    this.pendingSwitch.set(userId, true);

    return response;
  }

  private async handleSwitchSelection(userId: string, text: string): Promise<string> {
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
• /switch - Switch coding adapter (with context transfer)

Chat Mode (default):
Messages go to the primary LLM (${this.router.getProviderName()}) with terminal tool support.

Code Mode:
Messages go to the coding adapter (${this.router.getAdapterName()})

Use /code or /chat to switch modes, /switch to change adapters!`;
  }
}
