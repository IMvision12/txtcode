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

// Get version from package.json
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
  // Build menu items based on configuration status
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

  // Calculate content height for vertical centering
  const contentHeight =
    getBannerHeight() +
    1 + // spacing after banner
    (options.isConfigured ? 1 : 2) + // warning or spacing
    1 + // title line
    1 + // spacing
    menuItems.length; // menu items

  const topPadding = calculateVerticalPadding(contentHeight);

  const action = await showMenu({
    title: "What would you like to do? (Use arrow keys)",
    items: menuItems,
    onRender: () => {
      // Add vertical padding (no console.clear — the menu component handles cursor positioning)
      for (let i = 0; i < topPadding; i++) {
        console.log();
      }

      // Render banner
      renderBanner();
      console.log();

      // Show warning if not configured
      if (!options.isConfigured) {
        centerLog(chalk.yellow("⚠ Not configured yet"));
        console.log();
      } else {
        console.log();
      }
    },
    onRenderFooter: () => {
      // Calculate how many lines to move down to reach the bottom
      const termHeight = getTerminalHeight();
      const currentLine = topPadding + contentHeight + 2; // +2 for title and spacing
      const linesToBottom = Math.max(0, termHeight - currentLine - 1);

      // Move to bottom
      for (let i = 0; i < linesToBottom; i++) {
        console.log();
      }

      // Show directory on left and version on right at the absolute bottom
      const version = getVersion();
      const directory = process.cwd();
      const termWidth = getTerminalWidth();

      const leftText = chalk.gray(directory);
      const rightText = chalk.gray(`v${version}`);

      // Calculate spacing to position text at edges
      const leftTextLength = directory.length;
      const rightTextLength = version.length + 1; // +1 for 'v'
      const spacing = Math.max(0, termWidth - leftTextLength - rightTextLength - 2);

      console.log(leftText + " ".repeat(spacing) + rightText);
    },
  });

  return action;
}
