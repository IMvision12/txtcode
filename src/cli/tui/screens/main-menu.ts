import chalk from "chalk";
import { renderBanner, getBannerHeight } from "../components/banner";
import { showMenu, MenuItem } from "../components/menu";
import { centerText, centerLog, getTerminalWidth, calculateVerticalPadding } from "../components/centered-text";

export interface MainMenuOptions {
  isConfigured: boolean;
}

export async function showMainMenu(options: MainMenuOptions): Promise<string> {
  const terminalWidth = getTerminalWidth();

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
      console.clear();

      // Add vertical padding
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
  });

  return action;
}
