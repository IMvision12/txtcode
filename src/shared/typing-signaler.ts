/**
 * Typing indicator signaler for platforms
 * Inspired by OpenClaw's TypingSignaler
 */

export interface TypingSignaler {
  /**
   * Signal that text is being generated
   */
  signalTyping(): Promise<void>;

  /**
   * Signal text delta (for platforms that support it)
   */
  signalTextDelta(text: string): Promise<void>;

  /**
   * Stop typing indicator
   */
  stopTyping(): Promise<void>;
}

export class NoOpTypingSignaler implements TypingSignaler {
  async signalTyping(): Promise<void> {
    // No-op
  }

  async signalTextDelta(_text: string): Promise<void> {
    // No-op
  }

  async stopTyping(): Promise<void> {
    // No-op
  }
}

/**
 * Discord typing signaler
 */
export class DiscordTypingSignaler implements TypingSignaler {
  private channel: unknown;
  private lastTypingSignal: number = 0;
  private typingInterval: NodeJS.Timeout | null = null;

  constructor(channel: unknown) {
    this.channel = channel;
  }

  async signalTyping(): Promise<void> {
    const now = Date.now();
    // Discord typing indicator lasts 10 seconds, refresh every 8 seconds
    if (now - this.lastTypingSignal > 8000) {
      try {
        const ch = this.channel as Record<string, unknown>;
        if ("sendTyping" in ch && typeof ch.sendTyping === "function") {
          await ch.sendTyping();
          this.lastTypingSignal = now;
        }
      } catch {
        // Ignore typing errors
      }
    }
  }

  async signalTextDelta(_text: string): Promise<void> {
    await this.signalTyping();
  }

  async stopTyping(): Promise<void> {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }
  }
}

/**
 * Telegram typing signaler
 */
export class TelegramTypingSignaler implements TypingSignaler {
  private ctx: unknown;
  private lastTypingSignal: number = 0;

  constructor(ctx: unknown) {
    this.ctx = ctx;
  }

  async signalTyping(): Promise<void> {
    const now = Date.now();
    // Telegram typing indicator lasts 5 seconds, refresh every 4 seconds
    if (now - this.lastTypingSignal > 4000) {
      try {
        const ctx = this.ctx as {
          telegram: { sendChatAction: (chatId: unknown, action: string) => Promise<void> };
          chat: { id: unknown };
        };
        await ctx.telegram.sendChatAction(ctx.chat.id, "typing");
        this.lastTypingSignal = now;
      } catch {
        // Ignore typing errors
      }
    }
  }

  async signalTextDelta(_text: string): Promise<void> {
    await this.signalTyping();
  }

  async stopTyping(): Promise<void> {
    // Telegram typing stops automatically
  }
}

/**
 * WhatsApp typing signaler
 */
export class WhatsAppTypingSignaler implements TypingSignaler {
  private sock: unknown;
  private jid: string;
  private lastTypingSignal: number = 0;

  constructor(sock: unknown, jid: string) {
    this.sock = sock;
    this.jid = jid;
  }

  async signalTyping(): Promise<void> {
    const now = Date.now();
    // WhatsApp typing indicator, refresh every 3 seconds
    if (now - this.lastTypingSignal > 3000) {
      try {
        const sock = this.sock as {
          sendPresenceUpdate: (status: string, jid: string) => Promise<void>;
        };
        await sock.sendPresenceUpdate("composing", this.jid);
        this.lastTypingSignal = now;
      } catch {
        // Ignore typing errors
      }
    }
  }

  async signalTextDelta(_text: string): Promise<void> {
    await this.signalTyping();
  }

  async stopTyping(): Promise<void> {
    try {
      const sock = this.sock as {
        sendPresenceUpdate: (status: string, jid: string) => Promise<void>;
      };
      await sock.sendPresenceUpdate("paused", this.jid);
    } catch {
      // Ignore errors
    }
  }
}
