import { Telegraf } from "telegraf";
import { AgentCore } from "../core/agent";
import { logger } from "../shared/logger";

export class TelegramBot {
  private bot: Telegraf;
  private agent: AgentCore;

  constructor(agent: AgentCore) {
    this.agent = agent;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN not set in .env");
    }

    this.bot = new Telegraf(token);
    this.setupHandlers();
  }

  private setupHandlers() {
    this.bot.start((ctx) => {
      ctx.reply("Welcome to TxtCode! Send me coding instructions.");
    });

    this.bot.on("text", async (ctx) => {
      const from = ctx.from.id.toString();
      const text = ctx.message.text;

      logger.debug(`Incoming message from ${from}: ${text}`);

      const response = await this.agent.processMessage({
        from,
        text,
        timestamp: new Date(),
      });

      await ctx.reply(response);
      logger.debug("Replied successfully");
    });
  }

  async start() {
    logger.info("Starting Telegram bot...");
    await this.bot.launch();
    logger.info("Telegram bot is running!");

    process.once("SIGINT", () => this.bot.stop("SIGINT"));
    process.once("SIGTERM", () => this.bot.stop("SIGTERM"));
  }
}
