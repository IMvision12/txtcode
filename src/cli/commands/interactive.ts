import chalk from "chalk";
import { showMainMenu, showGoodbyeScreen, pressAnyKey } from "../tui";
import { authCommand, loadConfig } from "./auth";
import { configCommand } from "./config";
import { logsCommand } from "./logs";
import { resetCommand, logoutCommand, hardResetCommand } from "./reset";
import { startCommand } from "./start";

export async function interactiveMode(): Promise<void> {
  let running = true;

  while (running) {
    // Check configuration status
    const config = loadConfig();
    const isConfigured = config !== null;

    // Show main menu
    const action = await showMainMenu({ isConfigured });

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
          showGoodbyeScreen();
          running = false;
          process.exit(0);
          break;

        default:
          console.log(chalk.red("Unknown action"));
          await pressAnyKey();
      }
    } catch (error) {
      console.log(
        chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}\n`),
      );
      await pressAnyKey();
    }
  }
}
