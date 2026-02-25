import chalk from "chalk";
import inquirer from "inquirer";
import { authCommand, loadConfig } from "./auth";
import { startCommand } from "./start";
import { configCommand } from "./config";
import { logsCommand } from "./logs";
import { resetCommand, logoutCommand, hardResetCommand } from "./reset";

interface MainMenuChoice {
  name: string;
  value: string;
  description?: string;
}

function centerText(text: string, width: number): string {
  // Remove ANSI color codes to calculate actual text length
  const plainText = text.replace(/\x1b\[[0-9;]*m/g, "");
  const padding = Math.max(0, Math.floor((width - plainText.length) / 2));
  return " ".repeat(padding) + text;
}

function getTerminalWidth(): number {
  return process.stdout.columns || 80; // Default to 80 if not available
}

export async function interactiveMode(): Promise<void> {
  let running = true;

  while (running) {
    console.clear();
    
    const terminalWidth = getTerminalWidth();
    
    // ASCII logo lines
    const logoLines = [
      "████████╗██╗  ██╗████████╗ ██████╗ ██████╗ ██████╗ ███████╗",
      "╚══██╔══╝╚██╗██╔╝╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝",
      "   ██║    ╚███╔╝    ██║   ██║     ██║   ██║██║  ██║█████╗  ",
      "   ██║    ██╔██╗    ██║   ██║     ██║   ██║██║  ██║██╔══╝  ",
      "   ██║   ██╔╝ ██╗   ██║   ╚██████╗╚██████╔╝██████╔╝███████╗",
      "   ╚═╝   ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝",
    ];
    
    const subtitle = "Remote coding via WhatsApp, Telegram, Discord & iMessage";
    
    // Show banner - dynamically centered
    console.log(); // Top spacing
    logoLines.forEach(line => {
      console.log(centerText(chalk.white(line), terminalWidth));
    });
    console.log(); // Spacing after logo
    console.log(centerText(chalk.gray(subtitle), terminalWidth));
    console.log(); // Spacing after subtitle

    // Check configuration status
    const config = loadConfig();
    const isConfigured = config !== null;

    // Only show "Not configured yet" warning if not configured
    if (!isConfigured) {
      console.log(chalk.yellow("⚠ Not configured yet\n"));
    } else {
      console.log(); // Just add spacing if configured
    }

    // Build menu choices based on configuration status
    const choices: MainMenuChoice[] = [];

    if (!isConfigured) {
      choices.push({
        name: "Setup & Authentication" + chalk.gray(" - Configure TxtCode for first use"),
        value: "auth",
      });
    } else {
      choices.push({
        name: "Start Agent" + chalk.gray(" - Start the TxtCode agent"),
        value: "start",
      });
      choices.push({
        name: "Settings" + chalk.gray(" - Modify configuration"),
        value: "config",
      });
      choices.push({
        name: "Re-authenticate" + chalk.gray(" - Reconfigure authentication"),
        value: "auth",
      });
      choices.push({
        name: "View Logs" + chalk.gray(" - View session logs"),
        value: "logs",
      });
      choices.push({
        name: "Reset" + chalk.gray(" - Reset authorized user"),
        value: "reset",
      });
      choices.push({
        name: "Logout" + chalk.gray(" - Logout from messaging platform"),
        value: "logout",
      });
      choices.push({
        name: "Hard Reset" + chalk.gray(" - Delete all data"),
        value: "hard-reset",
      });
    }

    choices.push({
      name: chalk.gray("Exit"),
      value: "exit",
    });

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices,
        pageSize: 15,
      },
    ]);

    console.log(); // Add spacing

    try {
      switch (action) {
        case "auth":
          await authCommand();
          await pressAnyKey();
          break;

        case "start":
          console.log(chalk.cyan("Starting TxtCode agent...\n"));
          await startCommand({});
          // Start command runs indefinitely, so this won't be reached unless it exits
          await pressAnyKey();
          break;

        case "config":
          await configCommand();
          await pressAnyKey();
          break;

        case "logs":
          await logsCommand(undefined, { follow: false, all: false, clear: false });
          await pressAnyKey();
          break;

        case "reset":
          await resetCommand();
          await pressAnyKey();
          break;

        case "logout":
          await logoutCommand();
          await pressAnyKey();
          break;

        case "hard-reset":
          await hardResetCommand();
          await pressAnyKey();
          break;

        case "exit":
          console.log(chalk.gray("\nGoodbye!\n"));
          running = false;
          process.exit(0);
          break;

        default:
          console.log(chalk.red("Unknown action"));
          await pressAnyKey();
      }
    } catch (error) {
      console.log(chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}\n`));
      await pressAnyKey();
    }
  }
}

async function pressAnyKey(): Promise<void> {
  await inquirer.prompt([
    {
      type: "input",
      name: "continue",
      message: chalk.gray("Press Enter to continue..."),
    },
  ]);
}
