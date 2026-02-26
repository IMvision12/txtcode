import * as readline from "readline";
import chalk from "chalk";

export interface CenteredInputOptions {
  message: string;
  password?: boolean;
  validate?: (input: string) => boolean | string;
}

export async function showCenteredInput(options: CenteredInputOptions): Promise<string> {
  return new Promise((resolve) => {
    let input = "";
    const promptLine = options.message + " ";

    process.stdout.write(chalk.cyan(promptLine));

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
        if (options.validate) {
          const validation = options.validate(input);
          if (validation !== true) {
            console.log();
            const errorMsg = typeof validation === "string" ? validation : "Invalid input";
            console.log(chalk.red(errorMsg));
            console.log();

            process.stdout.write(chalk.cyan(promptLine));
            input = "";
            return;
          }
        }

        cleanup();
        console.log();
        resolve(input);
      } else if (key.name === "backspace") {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else if (str && !key.ctrl && !key.meta) {
        input += str;
        process.stdout.write(options.password ? "*" : str);
      }
    };

    process.stdin.on("keypress", onKeypress);
    process.stdin.resume();
  });
}
