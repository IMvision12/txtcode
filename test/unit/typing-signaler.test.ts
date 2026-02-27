import { describe, it, expect, vi } from "vitest";
import {
  NoOpTypingSignaler,
  DiscordTypingSignaler,
  TelegramTypingSignaler,
  SlackTypingSignaler,
  TeamsTypingSignaler,
  SignalTypingSignaler,
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

describe("SlackTypingSignaler", () => {
  it("all methods resolve without error (no-op)", async () => {
    const signaler = new SlackTypingSignaler();
    await signaler.signalTyping();
    await signaler.signalTextDelta("hello");
    await signaler.stopTyping();
  });
});

describe("TeamsTypingSignaler", () => {
  it("sends typing activity on signalTyping", async () => {
    const context = { sendActivity: vi.fn().mockResolvedValue(undefined) };
    const signaler = new TeamsTypingSignaler(context);

    await signaler.signalTyping();
    expect(context.sendActivity).toHaveBeenCalledWith({ type: "typing" });
  });

  it("throttles to 2s interval", async () => {
    const context = { sendActivity: vi.fn().mockResolvedValue(undefined) };
    const signaler = new TeamsTypingSignaler(context);

    await signaler.signalTyping();
    await signaler.signalTyping();

    expect(context.sendActivity).toHaveBeenCalledTimes(1);
  });

  it("ignores errors from sendActivity", async () => {
    const context = { sendActivity: vi.fn().mockRejectedValue(new Error("fail")) };
    const signaler = new TeamsTypingSignaler(context);

    await expect(signaler.signalTyping()).resolves.not.toThrow();
  });

  it("signalTextDelta delegates to signalTyping", async () => {
    const context = { sendActivity: vi.fn().mockResolvedValue(undefined) };
    const signaler = new TeamsTypingSignaler(context);

    await signaler.signalTextDelta("hello");
    expect(context.sendActivity).toHaveBeenCalledWith({ type: "typing" });
  });

  it("stopTyping resolves without error", async () => {
    const context = { sendActivity: vi.fn().mockResolvedValue(undefined) };
    const signaler = new TeamsTypingSignaler(context);
    await signaler.stopTyping();
  });
});

describe("SignalTypingSignaler", () => {
  it("calls fetch with PUT on signalTyping", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const signaler = new SignalTypingSignaler(
      "http://localhost:8080",
      "+1234567890",
      "+0987654321",
    );

    await signaler.signalTyping();
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/v1/typing-indicator/+1234567890",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ recipient: "+0987654321" }),
      }),
    );

    vi.unstubAllGlobals();
  });

  it("throttles to 3s interval", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const signaler = new SignalTypingSignaler(
      "http://localhost:8080",
      "+1234567890",
      "+0987654321",
    );

    await signaler.signalTyping();
    await signaler.signalTyping();

    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it("calls fetch with DELETE on stopTyping", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const signaler = new SignalTypingSignaler(
      "http://localhost:8080",
      "+1234567890",
      "+0987654321",
    );

    await signaler.stopTyping();
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/v1/typing-indicator/+1234567890",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ recipient: "+0987654321" }),
      }),
    );

    vi.unstubAllGlobals();
  });

  it("ignores errors from fetch", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", mockFetch);

    const signaler = new SignalTypingSignaler(
      "http://localhost:8080",
      "+1234567890",
      "+0987654321",
    );

    await expect(signaler.signalTyping()).resolves.not.toThrow();
    await expect(signaler.stopTyping()).resolves.not.toThrow();

    vi.unstubAllGlobals();
  });

  it("signalTextDelta delegates to signalTyping", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const signaler = new SignalTypingSignaler(
      "http://localhost:8080",
      "+1234567890",
      "+0987654321",
    );

    await signaler.signalTextDelta("hello");
    expect(mockFetch).toHaveBeenCalled();

    vi.unstubAllGlobals();
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
