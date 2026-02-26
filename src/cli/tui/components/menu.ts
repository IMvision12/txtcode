import * as readline from "readline";
import chalk from "chalk";
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

    const longestChoice = Math.max(
      ...options.items.map((item) => {
        // eslint-disable-next-line no-control-regex
        const plainText = item.name.replace(/\x1b\[[0-9;]*m/g, "");
        return plainText.length;
      }),
    );
    const menuWidth = longestChoice + 4;
    const leftPadding = Math.max(0, Math.floor((terminalWidth - menuWidth) / 2));

    const renderMenuItems = () => {
      options.items.forEach((item, index) => {
        const isSelected = index === selectedIndex;
        const bullet = isSelected ? chalk.green("● ") : chalk.gray("○ ");
        const arrow = isSelected ? chalk.cyan("→ ") : "  ";
        const text = isSelected ? chalk.cyan(item.name) : item.name;

        process.stdout.write("\x1b[2K");
        console.log(" ".repeat(leftPadding) + arrow + bullet + text);
      });
    };

    const render = (init: boolean) => {
      if (init) {
        process.stdout.write("\x1b[?1049h");
      }
      process.stdout.write("\x1b[H");
      process.stdout.write("\x1b[?25l");

      if (options.onRender) {
        options.onRender();
      }

      if (options.title) {
        process.stdout.write("\x1b[2K");
        console.log(centerText(chalk.cyan(options.title), terminalWidth));
        console.log();
      }

      renderMenuItems();

      if (options.onRenderFooter) {
        console.log();
        options.onRenderFooter();
      }

      process.stdout.write("\x1b[?25h");
    };

    const cleanup = () => {
      process.stdout.write("\x1b[?1049l");
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.removeListener("keypress", onKeypress);
      process.stdin.pause();
    };

    render(true);

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    const onKeypress = (_str: string, key: { name: string; ctrl?: boolean }) => {
      if (key.name === "up") {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : options.items.length - 1;
        render(false);
      } else if (key.name === "down") {
        selectedIndex = selectedIndex < options.items.length - 1 ? selectedIndex + 1 : 0;
        render(false);
      } else if (key.name === "return") {
        cleanup();
        resolve(options.items[selectedIndex].value);
      } else if (key.ctrl && key.name === "c") {
        cleanup();
        process.exit(0);
      }
    };

    process.stdin.on("keypress", onKeypress);
    process.stdin.resume();
  });
}
