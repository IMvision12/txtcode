import fs from "fs";
import path from "path";
import chalk from "chalk";
import { renderBanner, getBannerHeight } from "../components/banner";
import {
  centerLog,
  getTerminalHeight,
  getTerminalWidth,
  calculateVerticalPadding,
} from "../components/centered-text";
import { showMenu, MenuItem } from "../components/menu";

function getVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, "../../../package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version || "0.1.0";
  } catch {
    return "0.1.0";
  }
}

export interface MainMenuOptions {
  isConfigured: boolean;
}

export async function showMainMenu(options: MainMenuOptions): Promise<string> {
  const menuItems: MenuItem[] = [];

  if (!options.isConfigured) {
    menuItems.push({
      name: "Setup & Authentication" + chalk.gray(" - Configure TxtCode for first use"),
      value: "auth",
    });
  } else {
    menuItems.push(
      {
        name: "Start Agent" + chalk.gray(" - Start the TxtCode agent"),
        value: "start",
      },
      {
        name: "Settings" + chalk.gray(" - Modify configuration"),
        value: "config",
      },
      {
        name: "Re-authenticate" + chalk.gray(" - Reconfigure authentication"),
        value: "auth",
      },
      {
        name: "View Logs" + chalk.gray(" - View session logs"),
        value: "logs",
      },
      {
        name: "Reset" + chalk.gray(" - Reset authorized user"),
        value: "reset",
      },
      {
        name: "Logout" + chalk.gray(" - Logout from messaging platform"),
        value: "logout",
      },
      {
        name: "Hard Reset" + chalk.gray(" - Delete all data"),
        value: "hard-reset",
      },
      {
        name: "Help" + chalk.gray(" - View all platform commands"),
        value: "help",
      },
    );
  }

  menuItems.push({
    name: chalk.gray("Exit"),
    value: "exit",
  });

  const contentHeight =
    getBannerHeight() +
    1 +
    (options.isConfigured ? 1 : 2) +
    1 +
    1 +
    menuItems.length;

  const topPadding = calculateVerticalPadding(contentHeight);

  const action = await showMenu({
    title: "What would you like to do? (Use arrow keys)",
    items: menuItems,
    onRender: () => {
      for (let i = 0; i < topPadding; i++) {
        console.log();
      }

      renderBanner();
      console.log();

      if (!options.isConfigured) {
        centerLog(chalk.yellow("⚠ Not configured yet"));
        console.log();
      } else {
        console.log();
      }
    },
    onRenderFooter: () => {
      const termHeight = getTerminalHeight();
      const currentLine = topPadding + contentHeight + 2; // +2 for title and spacing
      const linesToBottom = Math.max(0, termHeight - currentLine - 1);

      for (let i = 0; i < linesToBottom; i++) {
        console.log();
      }

      const version = getVersion();
      const directory = process.cwd();
      const termWidth = getTerminalWidth();

      const leftText = chalk.gray(directory);
      const rightText = chalk.gray(`v${version}`);

      const leftTextLength = directory.length;
      const rightTextLength = version.length + 1; // +1 for 'v'
      const spacing = Math.max(0, termWidth - leftTextLength - rightTextLength - 2);

      console.log(leftText + " ".repeat(spacing) + rightText);
    },
  });

  return action;
}
