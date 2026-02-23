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
  private channel: any;
  private lastTypingSignal: number = 0;
  private typingInterval: NodeJS.Timeout | null = null;

  constructor(channel: any) {
    this.channel = channel;
  }

  async signalTyping(): Promise<void> {
    const now = Date.now();
    // Discord typing indicator lasts 10 seconds, refresh every 8 seconds
    if (now - this.lastTypingSignal > 8000) {
      try {
        if ("sendTyping" in this.channel) {
          await this.channel.sendTyping();
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
  private ctx: any;
  private lastTypingSignal: number = 0;

  constructor(ctx: any) {
    this.ctx = ctx;
  }

  async signalTyping(): Promise<void> {
    const now = Date.now();
    // Telegram typing indicator lasts 5 seconds, refresh every 4 seconds
    if (now - this.lastTypingSignal > 4000) {
      try {
        await this.ctx.telegram.sendChatAction(this.ctx.chat.id, "typing");
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
  private sock: any;
  private jid: string;
  private lastTypingSignal: number = 0;

  constructor(sock: any, jid: string) {
    this.sock = sock;
    this.jid = jid;
  }

  async signalTyping(): Promise<void> {
    const now = Date.now();
    // WhatsApp typing indicator, refresh every 3 seconds
    if (now - this.lastTypingSignal > 3000) {
      try {
        await this.sock.sendPresenceUpdate("composing", this.jid);
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
      await this.sock.sendPresenceUpdate("paused", this.jid);
    } catch {
      // Ignore errors
    }
  }
}
