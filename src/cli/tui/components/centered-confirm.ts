import * as readline from "readline";
import chalk from "chalk";

export interface CenteredConfirmOptions {
  message: string;
  default?: boolean;
}

export async function showCenteredConfirm(options: CenteredConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const defaultValue = options.default !== undefined ? options.default : true;

    const fullMessage = `${options.message} ${chalk.gray(`(${defaultValue ? "Y/n" : "y/N"})`)}: `;
    process.stdout.write(fullMessage);

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    const cleanup = () => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.removeListener("keypress", onKeypress);
      process.stdin.pause();
    };

    const onKeypress = (str: string, key: any) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        process.exit(0);
      } else if (key.name === "return") {
        cleanup();
        console.log();
        resolve(defaultValue);
      } else if (str === "y" || str === "Y") {
        cleanup();
        console.log(chalk.green("Yes"));
        resolve(true);
      } else if (str === "n" || str === "N") {
        cleanup();
        console.log(chalk.red("No"));
        resolve(false);
      }
    };

    process.stdin.on("keypress", onKeypress);
    process.stdin.resume();
  });
}
