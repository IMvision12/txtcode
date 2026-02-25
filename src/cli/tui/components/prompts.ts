import inquirer from "inquirer";
import chalk from "chalk";
import { centerLog } from "./centered-text";

/**
 * Centered prompt wrapper for inquirer
 */
export async function centeredPrompt(
  questions: inquirer.QuestionCollection,
  title?: string,
): Promise<inquirer.Answers> {
  if (title) {
    console.log();
    centerLog(chalk.cyan(title));
    console.log();
  }

  return inquirer.prompt(questions);
}

/**
 * Show a centered message
 */
export function showMessage(message: string, type: "info" | "success" | "warning" | "error" = "info"): void {
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

/**
 * Press any key to continue
 */
export async function pressAnyKey(message: string = "Press Enter to continue..."): Promise<void> {
  await inquirer.prompt([
    {
      type: "input",
      name: "continue",
      message: chalk.gray(message),
    },
  ]);
}
