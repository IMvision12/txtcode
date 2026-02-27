import readline from "readline";
import chalk from "chalk";
import { centerLog } from "./centered-text";

export function showMessage(
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
): void {
  console.log();

  switch (type) {
    case "success":
      centerLog(chalk.green(message));
      break;
    case "warning":
      centerLog(chalk.yellow(message));
      break;
    case "error":
      centerLog(chalk.red(message));
      break;
    default:
      centerLog(chalk.gray(message));
  }

  console.log();
}

export async function pressAnyKey(message: string = "Press Enter to continue..."): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(chalk.gray(message), () => {
      rl.close();
      resolve();
    });
  });
}
