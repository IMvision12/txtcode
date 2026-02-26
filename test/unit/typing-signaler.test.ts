import { describe, it, expect, vi } from "vitest";
import {
  NoOpTypingSignaler,
  DiscordTypingSignaler,
  TelegramTypingSignaler,
  WhatsAppTypingSignaler,
} from "../../src/shared/typing-signaler";

describe("NoOpTypingSignaler", () => {
  it("all methods resolve without error", async () => {
    const signaler = new NoOpTypingSignaler();
    await signaler.signalTyping();
    await signaler.signalTextDelta("text");
    await signaler.stopTyping();
  });
});

describe("DiscordTypingSignaler", () => {
  it("calls channel.sendTyping on signalTyping", async () => {
    const channel = { sendTyping: vi.fn().mockResolvedValue(undefined) };
    const signaler = new DiscordTypingSignaler(channel);

    await signaler.signalTyping();
    expect(channel.sendTyping).toHaveBeenCalled();
  });

  it("throttles sendTyping calls (8s interval)", async () => {
    const channel = { sendTyping: vi.fn().mockResolvedValue(undefined) };
    const signaler = new DiscordTypingSignaler(channel);

    await signaler.signalTyping();
    await signaler.signalTyping();
    await signaler.signalTyping();

    // Only first call should go through (subsequent within 8s window are skipped)
    expect(channel.sendTyping).toHaveBeenCalledTimes(1);
  });

  it("ignores errors from sendTyping", async () => {
    const channel = { sendTyping: vi.fn().mockRejectedValue(new Error("fail")) };
    const signaler = new DiscordTypingSignaler(channel);

    await expect(signaler.signalTyping()).resolves.not.toThrow();
  });

  it("signalTextDelta delegates to signalTyping", async () => {
    const channel = { sendTyping: vi.fn().mockResolvedValue(undefined) };
    const signaler = new DiscordTypingSignaler(channel);

    await signaler.signalTextDelta("hello");
    expect(channel.sendTyping).toHaveBeenCalled();
  });
});

describe("TelegramTypingSignaler", () => {
  it("sends typing chat action", async () => {
    const ctx = {
      telegram: { sendChatAction: vi.fn().mockResolvedValue(undefined) },
      chat: { id: 123 },
    };
    const signaler = new TelegramTypingSignaler(ctx);

    await signaler.signalTyping();
    expect(ctx.telegram.sendChatAction).toHaveBeenCalledWith(123, "typing");
  });

  it("throttles to 4s interval", async () => {
    const ctx = {
      telegram: { sendChatAction: vi.fn().mockResolvedValue(undefined) },
      chat: { id: 123 },
    };
    const signaler = new TelegramTypingSignaler(ctx);

    await signaler.signalTyping();
    await signaler.signalTyping();

    expect(ctx.telegram.sendChatAction).toHaveBeenCalledTimes(1);
  });

  it("stopTyping resolves without error", async () => {
    const ctx = {
      telegram: { sendChatAction: vi.fn().mockResolvedValue(undefined) },
      chat: { id: 123 },
    };
    const signaler = new TelegramTypingSignaler(ctx);
    await signaler.stopTyping();
  });
});

describe("WhatsAppTypingSignaler", () => {
  it("sends composing presence update", async () => {
    const sock = { sendPresenceUpdate: vi.fn().mockResolvedValue(undefined) };
    const signaler = new WhatsAppTypingSignaler(sock, "123@s.whatsapp.net");

    await signaler.signalTyping();
    expect(sock.sendPresenceUpdate).toHaveBeenCalledWith("composing", "123@s.whatsapp.net");
  });

  it("sends paused presence on stopTyping", async () => {
    const sock = { sendPresenceUpdate: vi.fn().mockResolvedValue(undefined) };
    const signaler = new WhatsAppTypingSignaler(sock, "123@s.whatsapp.net");

    await signaler.stopTyping();
    expect(sock.sendPresenceUpdate).toHaveBeenCalledWith("paused", "123@s.whatsapp.net");
  });

  it("throttles to 3s interval", async () => {
    const sock = { sendPresenceUpdate: vi.fn().mockResolvedValue(undefined) };
    const signaler = new WhatsAppTypingSignaler(sock, "jid");

    await signaler.signalTyping();
    await signaler.signalTyping();

    expect(sock.sendPresenceUpdate).toHaveBeenCalledTimes(1);
  });
});
