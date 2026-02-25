import chalk from "chalk";
import * as readline from "readline";
import { centerText, getTerminalWidth } from "./centered-text";

export interface MenuItem {
  name: string;
  value: string;
  description?: string;
}

export interface MenuOptions {
  title?: string;
  items: MenuItem[];
  onRender?: () => void;
  onRenderFooter?: () => void;
}

export async function showMenu(options: MenuOptions): Promise<string> {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    const terminalWidth = getTerminalWidth();

    const renderMenuItems = () => {
      // Find the longest choice text to determine menu width
      const longestChoice = Math.max(
        ...options.items.map((item) => {
          const plainText = item.name.replace(/\x1b\[[0-9;]*m/g, "");
          return plainText.length;
        }),
      );

      const menuWidth = longestChoice + 4; // Add space for bullet and arrow
      const leftPadding = Math.max(0, Math.floor((terminalWidth - menuWidth) / 2));

      options.items.forEach((item, index) => {
        const isSelected = index === selectedIndex;
        const bullet = isSelected ? chalk.green("● ") : chalk.gray("○ ");
        const arrow = isSelected ? chalk.cyan("→ ") : "  ";
        const text = isSelected ? chalk.cyan(item.name) : item.name;

        // Clear the line and write new content
        process.stdout.write("\x1b[2K"); // Clear entire line
        console.log(" ".repeat(leftPadding) + arrow + bullet + text);
      });
    };

    const renderFullMenu = () => {
      if (options.onRender) {
        options.onRender();
      }

      if (options.title) {
        console.log(centerText(chalk.cyan(options.title), terminalWidth));
        console.log();
      }

      renderMenuItems();

      if (options.onRenderFooter) {
        console.log();
        options.onRenderFooter();
      }
    };

    // Initial render
    renderFullMenu();

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    const onKeypress = (str: string, key: any) => {
      if (key.name === "up") {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : options.items.length - 1;
        // Clear screen and re-render everything
        console.clear();
        renderFullMenu();
      } else if (key.name === "down") {
        selectedIndex = selectedIndex < options.items.length - 1 ? selectedIndex + 1 : 0;
        // Clear screen and re-render everything
        console.clear();
        renderFullMenu();
      } else if (key.name === "return") {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.removeListener("keypress", onKeypress);
        process.stdin.pause();
        resolve(options.items[selectedIndex].value);
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
