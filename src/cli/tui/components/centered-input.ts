import chalk from "chalk";
import * as readline from "readline";

export interface CenteredInputOptions {
  message: string;
  password?: boolean;
  validate?: (input: string) => boolean | string;
}

export async function showCenteredInput(options: CenteredInputOptions): Promise<string> {
  return new Promise((resolve) => {
    let input = "";

    // Create the full prompt line: "Enter API Key: " (left-aligned)
    const promptLine = options.message + " ";
    
    // Write the left-aligned prompt
    process.stdout.write(chalk.cyan(promptLine));

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    const onKeypress = (str: string, key: any) => {
      if (key.ctrl && key.name === "c") {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.exit(0);
      } else if (key.name === "return") {
        // Validate input
        if (options.validate) {
          const validation = options.validate(input);
          if (validation !== true) {
            console.log();
            const errorMsg = typeof validation === "string" ? validation : "Invalid input";
            console.log(chalk.red(errorMsg));
            console.log();
            
            // Re-prompt on same line (left-aligned)
            process.stdout.write(chalk.cyan(promptLine));
            input = "";
            return;
          }
        }

        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.removeListener("keypress", onKeypress);
        process.stdin.pause();
        console.log(); // New line after input
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
