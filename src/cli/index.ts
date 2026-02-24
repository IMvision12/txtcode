#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import { showBanner } from "../shared/banner";
import { authCommand } from "./commands/auth";
import { configCommand } from "./commands/config";
import { logsCommand } from "./commands/logs";
import { resetCommand, logoutCommand, hardResetCommand } from "./commands/reset";
import { startCommand } from "./commands/start";

showBanner();

const program = new Command();

program.name("txtcode").description("Remote IDE control via WhatsApp/Telegram").version("0.1.0");

program.command("auth").description("Authenticate and configure TxtCode").action(authCommand);

program
  .command("start")
  .description("Start the TxtCode agent")
  .option("-d, --daemon", "Run as daemon")
  .action(startCommand);

program.command("config").description("Configure TxtCode settings").action(configCommand);

program
  .command("stop")
  .description("Stop the agent")
  .action(() => {
    console.log(chalk.yellow("Stopping agent..."));
  });

program.command("reset").description("Reset authorized user").action(resetCommand);

program
  .command("logout")
  .description("Logout from WhatsApp (delete session)")
  .action(logoutCommand);

program
  .command("hard-reset")
  .description("Delete all configuration and authentication data")
  .action(hardResetCommand);

program
  .command("logs")
  .description("View session logs")
  .argument("[session]", "Session number to view (run without args to list sessions)")
  .option("-f, --follow", "Follow the latest session log in real-time")
  .option("--all", "Show full log file")
  .option("-n, --lines <count>", "Number of lines to show (default: 50)")
  .option("--clear", "Delete all session log files")
  .action(logsCommand);

program.parse();
