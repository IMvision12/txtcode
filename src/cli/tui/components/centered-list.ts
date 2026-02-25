import * as readline from "readline";
import chalk from "chalk";

export interface ListItem {
  name: string;
  value: string;
}

export interface CenteredListOptions {
  message: string;
  choices: ListItem[];
  pageSize?: number; // Number of items per page
}

export async function showCenteredList(options: CenteredListOptions): Promise<string> {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    let currentPage = 0;
    const pageSize = options.pageSize || options.choices.length; // Default to all items if no pageSize
    const totalPages = Math.ceil(options.choices.length / pageSize);

    const getCurrentPageItems = () => {
      const start = currentPage * pageSize;
      const end = Math.min(start + pageSize, options.choices.length);
      return options.choices.slice(start, end);
    };

    const getGlobalIndex = (localIndex: number) => {
      return currentPage * pageSize + localIndex;
    };

    const getLocalIndex = (globalIndex: number) => {
      return globalIndex - currentPage * pageSize;
    };

    const renderList = () => {
      const pageItems = getCurrentPageItems();
      const localSelectedIndex = getLocalIndex(selectedIndex);

      pageItems.forEach((item, index) => {
        const isSelected = index === localSelectedIndex;
        const bullet = isSelected ? chalk.green("● ") : chalk.gray("○ ");
        const arrow = isSelected ? chalk.cyan("→ ") : "  ";
        const text = isSelected ? chalk.cyan(item.name) : item.name;

        // Clear the line and write new content (left-aligned)
        process.stdout.write("\x1b[2K"); // Clear entire line
        console.log(arrow + bullet + text);
      });

      // Show pagination info if paginated
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
      const pageItems = getCurrentPageItems();
      const localSelectedIndex = getLocalIndex(selectedIndex);
      const linesToClear = pageItems.length + (totalPages > 1 ? 2 : 0); // +2 for pagination info

      if (key.name === "up") {
        if (localSelectedIndex > 0) {
          // Move up within current page
          selectedIndex--;
        } else if (currentPage > 0) {
          // Move to previous page, last item
          currentPage--;
          selectedIndex = Math.min(getGlobalIndex(pageSize - 1), options.choices.length - 1);
        } else {
          // Wrap to last page, last item
          currentPage = totalPages - 1;
          selectedIndex = options.choices.length - 1;
        }
        process.stdout.write(`\x1b[${linesToClear}A`);
        renderList();
      } else if (key.name === "down") {
        if (localSelectedIndex < pageItems.length - 1) {
          // Move down within current page
          selectedIndex++;
        } else if (currentPage < totalPages - 1) {
          // Move to next page, first item
          currentPage++;
          selectedIndex = getGlobalIndex(0);
        } else {
          // Wrap to first page, first item
          currentPage = 0;
          selectedIndex = 0;
        }
        process.stdout.write(`\x1b[${linesToClear}A`);
        renderList();
      } else if (key.name === "left" && totalPages > 1) {
        // Previous page
        if (currentPage > 0) {
          currentPage--;
          selectedIndex = getGlobalIndex(
            Math.min(localSelectedIndex, getCurrentPageItems().length - 1),
          );
        } else {
          currentPage = totalPages - 1;
          selectedIndex = getGlobalIndex(
            Math.min(localSelectedIndex, getCurrentPageItems().length - 1),
          );
        }
        process.stdout.write(`\x1b[${linesToClear}A`);
        renderList();
      } else if (key.name === "right" && totalPages > 1) {
        // Next page
        if (currentPage < totalPages - 1) {
          currentPage++;
          selectedIndex = getGlobalIndex(
            Math.min(localSelectedIndex, getCurrentPageItems().length - 1),
          );
        } else {
          currentPage = 0;
          selectedIndex = getGlobalIndex(
            Math.min(localSelectedIndex, getCurrentPageItems().length - 1),
          );
        }
        process.stdout.write(`\x1b[${linesToClear}A`);
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
