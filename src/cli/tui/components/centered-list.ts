import chalk from "chalk";
import * as readline from "readline";

export interface ListItem {
  name: string;
  value: string;
}

export interface CenteredListOptions {
  message: string;
  choices: ListItem[];
}

export async function showCenteredList(options: CenteredListOptions): Promise<string> {
  return new Promise((resolve) => {
    let selectedIndex = 0;

    const renderList = () => {
      options.choices.forEach((item, index) => {
        const isSelected = index === selectedIndex;
        const bullet = isSelected ? chalk.green("● ") : chalk.gray("○ ");
        const arrow = isSelected ? chalk.cyan("→ ") : "  ";
        const text = isSelected ? chalk.cyan(item.name) : item.name;

        // Clear the line and write new content (left-aligned)
        process.stdout.write("\x1b[2K"); // Clear entire line
        console.log(arrow + bullet + text);
      });
    };

    const renderFullList = () => {
      // Left-aligned message
      console.log(chalk.cyan(options.message));
      console.log();

      renderList();
    };

    // Initial render
    renderFullList();

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    const onKeypress = (str: string, key: any) => {
      if (key.name === "up") {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : options.choices.length - 1;
        // Move cursor up and re-render list items
        process.stdout.write(`\x1b[${options.choices.length}A`);
        renderList();
      } else if (key.name === "down") {
        selectedIndex = selectedIndex < options.choices.length - 1 ? selectedIndex + 1 : 0;
        // Move cursor up and re-render list items
        process.stdout.write(`\x1b[${options.choices.length}A`);
        renderList();
      } else if (key.name === "return") {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.removeListener("keypress", onKeypress);
        process.stdin.pause();
        console.log(); // Add spacing after selection
        resolve(options.choices[selectedIndex].value);
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
