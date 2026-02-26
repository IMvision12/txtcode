import * as readline from "readline";
import chalk from "chalk";

export interface ListItem {
  name: string;
  value: string;
}

export interface CenteredListOptions {
  message: string;
  choices: ListItem[];
  pageSize?: number;
}

export async function showCenteredList(options: CenteredListOptions): Promise<string> {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    let currentPage = 0;
    const pageSize = options.pageSize || options.choices.length;
    const totalPages = Math.ceil(options.choices.length / pageSize);

    const getCurrentPageItems = () => {
      const start = currentPage * pageSize;
      const end = Math.min(start + pageSize, options.choices.length);
      return options.choices.slice(start, end);
    };

    const toGlobalIndex = (localIndex: number) => currentPage * pageSize + localIndex;
    const toLocalIndex = (globalIndex: number) => globalIndex - currentPage * pageSize;

    const renderList = () => {
      const pageItems = getCurrentPageItems();
      const localSelected = toLocalIndex(selectedIndex);

      pageItems.forEach((item, index) => {
        const isSelected = index === localSelected;
        const bullet = isSelected ? chalk.green("● ") : chalk.gray("○ ");
        const arrow = isSelected ? chalk.cyan("→ ") : "  ";
        const text = isSelected ? chalk.cyan(item.name) : item.name;

        process.stdout.write("\x1b[2K");
        console.log(arrow + bullet + text);
      });

      if (totalPages > 1) {
        process.stdout.write("\x1b[2K");
        console.log();
        process.stdout.write("\x1b[2K");
        console.log(
          chalk.gray(
            `Page ${currentPage + 1}/${totalPages} • Use ← → to navigate pages • ${options.choices.length} total items`,
          ),
        );
      }
    };

    const getTotalRenderedLines = () => {
      return getCurrentPageItems().length + (totalPages > 1 ? 2 : 0);
    };

    const renderHeader = () => {
      console.log(chalk.cyan(options.message));
      console.log();
    };

    // Initial render
    renderHeader();
    renderList();

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

    const redraw = () => {
      process.stdout.write(`\x1b[${getTotalRenderedLines()}A`);
      renderList();
    };

    const switchPage = (newPage: number) => {
      const localIdx = toLocalIndex(selectedIndex);
      currentPage = newPage;
      const pageItems = getCurrentPageItems();
      selectedIndex = toGlobalIndex(Math.min(localIdx, pageItems.length - 1));
      redraw();
    };

    const onKeypress = (_str: string, key: { name: string; ctrl?: boolean }) => {
      const pageItems = getCurrentPageItems();
      const localIdx = toLocalIndex(selectedIndex);

      if (key.name === "up") {
        if (localIdx > 0) {
          selectedIndex--;
        } else if (currentPage > 0) {
          currentPage--;
          selectedIndex = Math.min(toGlobalIndex(pageSize - 1), options.choices.length - 1);
        } else {
          currentPage = totalPages - 1;
          selectedIndex = options.choices.length - 1;
        }
        redraw();
      } else if (key.name === "down") {
        if (localIdx < pageItems.length - 1) {
          selectedIndex++;
        } else if (currentPage < totalPages - 1) {
          currentPage++;
          selectedIndex = toGlobalIndex(0);
        } else {
          currentPage = 0;
          selectedIndex = 0;
        }
        redraw();
      } else if (key.name === "left" && totalPages > 1) {
        switchPage(currentPage > 0 ? currentPage - 1 : totalPages - 1);
      } else if (key.name === "right" && totalPages > 1) {
        switchPage(currentPage < totalPages - 1 ? currentPage + 1 : 0);
      } else if (key.name === "return") {
        cleanup();
        console.log();
        resolve(options.choices[selectedIndex].value);
      } else if (key.ctrl && key.name === "c") {
        cleanup();
        process.exit(0);
      }
    };

    process.stdin.on("keypress", onKeypress);
    process.stdin.resume();
  });
}
