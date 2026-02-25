import chalk from "chalk";
import inquirer from "inquirer";
import { authCommand, loadConfig } from "./auth";
import { startCommand } from "./start";
import { configCommand } from "./config";
import { logsCommand } from "./logs";
import { resetCommand, logoutCommand, hardResetCommand } from "./reset";
import * as readline from "readline";

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

async function showCenteredMenu(choices: MainMenuChoice[], terminalWidth: number): Promise<string> {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    let isFirstRender = true;
    
    const renderBanner = () => {
      console.clear();
      
      const terminalHeight = process.stdout.rows || 24;
      
      // Re-render banner
      const logoLines = [
        "████████╗██╗  ██╗████████╗ ██████╗ ██████╗ ██████╗ ███████╗",
        "╚══██╔══╝╚██╗██╔╝╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝",
        "   ██║    ╚███╔╝    ██║   ██║     ██║   ██║██║  ██║█████╗  ",
        "   ██║    ██╔██╗    ██║   ██║     ██║   ██║██║  ██║██╔══╝  ",
        "   ██║   ██╔╝ ██╗   ██║   ╚██████╗╚██████╔╝██████╔╝███████╗",
        "   ╚═╝   ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝",
      ];
      
      const subtitle = "Remote coding via WhatsApp, Telegram, Discord & iMessage";
      
      const config = loadConfig();
      const isConfigured = config !== null;
      
      // Calculate total content height
      const contentHeight = logoLines.length + 1 + 1 + (isConfigured ? 1 : 2) + 1 + 1 + choices.length;
      const topPadding = Math.max(0, Math.floor((terminalHeight - contentHeight) / 2));
      
      // Add vertical padding
      for (let i = 0; i < topPadding; i++) {
        console.log();
      }
      
      logoLines.forEach(line => {
        console.log(centerText(chalk.white(line), terminalWidth));
      });
      console.log();
      console.log(centerText(chalk.gray(subtitle), terminalWidth));
      console.log();
      
      if (!isConfigured) {
        console.log(centerText(chalk.yellow("⚠ Not configured yet"), terminalWidth));
        console.log();
      } else {
        console.log();
      }
      
      console.log(centerText(chalk.cyan("What would you like to do? (Use arrow keys)"), terminalWidth));
      console.log();
    };
    
    const renderMenu = () => {
      if (isFirstRender) {
        renderBanner();
        isFirstRender = false;
      } else {
        // Move cursor up to the start of menu items
        process.stdout.write(`\x1b[${choices.length}A`);
      }
      
      // Find the longest choice text to determine menu width
      const longestChoice = Math.max(...choices.map(choice => {
        const plainText = choice.name.replace(/\x1b\[[0-9;]*m/g, "");
        return plainText.length;
      }));
      
      const menuWidth = longestChoice + 4; // Add space for prefix "> "
      const leftPadding = Math.max(0, Math.floor((terminalWidth - menuWidth) / 2));
      
      choices.forEach((choice, index) => {
        const isSelected = index === selectedIndex;
        const bullet = isSelected ? chalk.green("● ") : chalk.gray("○ ");
        const arrow = isSelected ? chalk.cyan("→ ") : "  ";
        const text = isSelected ? chalk.cyan(choice.name) : choice.name;
        
        // Clear the line and write new content
        process.stdout.write("\x1b[2K"); // Clear entire line
        console.log(" ".repeat(leftPadding) + arrow + bullet + text);
      });
    };
    
    renderMenu();
    
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    const onKeypress = (str: string, key: any) => {
      if (key.name === "up") {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : choices.length - 1;
        renderMenu();
      } else if (key.name === "down") {
        selectedIndex = selectedIndex < choices.length - 1 ? selectedIndex + 1 : 0;
        renderMenu();
      } else if (key.name === "return") {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.removeListener("keypress", onKeypress);
        process.stdin.pause();
        resolve(choices[selectedIndex].value);
      } else if (key.ctrl && key.name === "c") {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.exit(0);
      }
    };
    
    process.stdin.on("keypress", onKeypress);
    process.stdin.resume();
  });
}

export async function interactiveMode(): Promise<void> {
  let running = true;

  while (running) {
    const terminalWidth = getTerminalWidth();
    
    // Check configuration status
    const config = loadConfig();
    const isConfigured = config !== null;

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

    const action = await showCenteredMenu(choices, terminalWidth);

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
          console.clear();
          
          const exitTerminalWidth = getTerminalWidth();
          
          // Show banner on exit
          const exitLogoLines = [
            "████████╗██╗  ██╗████████╗ ██████╗ ██████╗ ██████╗ ███████╗",
            "╚══██╔══╝╚██╗██╔╝╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝",
            "   ██║    ╚███╔╝    ██║   ██║     ██║   ██║██║  ██║█████╗  ",
            "   ██║    ██╔██╗    ██║   ██║     ██║   ██║██║  ██║██╔══╝  ",
            "   ██║   ██╔╝ ██╗   ██║   ╚██████╗╚██████╔╝██████╔╝███████╗",
            "   ╚═╝   ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝",
          ];
          
          const exitSubtitle = "Remote coding via WhatsApp, Telegram & Discord";
          
          console.log();
          exitLogoLines.forEach(line => {
            console.log(centerText(chalk.white(line), exitTerminalWidth));
          });
          console.log();
          console.log(centerText(chalk.gray(exitSubtitle), exitTerminalWidth));
          console.log();
          console.log();
          console.log(centerText(chalk.gray("👋 Goodbye!"), exitTerminalWidth));
          console.log();
          
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
