import fs from "fs";
import os from "os";
import path from "path";
import chalk from "chalk";
import { centerLog, showCenteredConfirm } from "../tui";

const CONFIG_DIR = path.join(os.homedir(), ".txtcode");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const WA_AUTH_DIR = path.join(CONFIG_DIR, ".wacli_auth");

export async function resetCommand() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      console.log();
      centerLog(chalk.red("❌ Config file not found."));
      console.log();
      centerLog(chalk.yellow("Run authentication to set up first."));
      console.log();
      return;
    }

    let config;
    try {
      const configData = fs.readFileSync(CONFIG_FILE, "utf-8");
      config = JSON.parse(configData);
    } catch (parseError) {
      console.log();
      centerLog(chalk.red("❌ Config file is corrupted."));
      console.log();
      centerLog(chalk.yellow("Run authentication to reconfigure."));
      console.log();
      return;
    }

    config.authorizedUser = "";

    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
      console.log();
      centerLog(chalk.green("✅ Authorized user reset!"));
      console.log();
      centerLog(chalk.cyan("The next person to message will become the authorized user."));
      console.log();
    } catch (writeError) {
      console.log();
      centerLog(chalk.red("❌ Failed to save config file."));
      console.log();
    }
  } catch (error) {
    console.log();
    centerLog(chalk.red("❌ Failed to reset. Unexpected error."));
    console.log();
  }
}

export async function logoutCommand() {
  try {
    if (fs.existsSync(WA_AUTH_DIR)) {
      fs.rmSync(WA_AUTH_DIR, { recursive: true, force: true });
      console.log();
      centerLog(chalk.green("✅ WhatsApp session deleted!"));
      console.log();
      centerLog(chalk.cyan("Run start to scan QR code again."));
      console.log();
    } else {
      console.log();
      centerLog(chalk.yellow("⚠️ No WhatsApp session found."));
      console.log();
    }
  } catch (error) {
    console.log();
    centerLog(chalk.red("❌ Failed to delete session."));
    console.log();
  }
}

export async function hardResetCommand() {
  console.log();
  centerLog(chalk.yellow("⚠️  HARD RESET - This will delete ALL TxtCode data:"));
  console.log();
  centerLog(chalk.gray("• Configuration file (~/.txtcode/config.json)"));
  centerLog(chalk.gray("• WhatsApp authentication (~/.txtcode/.wacli_auth)"));
  centerLog(chalk.gray("• All settings and authorized users"));
  console.log();

  const confirmed = await showCenteredConfirm({
    message: "Are you sure? This cannot be undone!",
    default: false,
  });

  if (confirmed) {
    let deletedItems = 0;

    try {
      if (fs.existsSync(CONFIG_DIR)) {
        fs.rmSync(CONFIG_DIR, { recursive: true, force: true });
        console.log();
        centerLog(chalk.green("✓ Deleted configuration directory"));
        deletedItems++;
      }
    } catch (error) {
      console.log();
      centerLog(chalk.red("✗ Failed to delete configuration directory"));
    }

    if (deletedItems > 0) {
      console.log();
      centerLog(chalk.green(`✅ Hard reset complete! Deleted ${deletedItems} item(s).`));
      console.log();
      centerLog(chalk.cyan("Run authentication to set up again."));
      console.log();
    } else {
      console.log();
      centerLog(chalk.yellow("⚠️ No data found to delete."));
      console.log();
    }
  } else {
    console.log();
    centerLog(chalk.yellow("❌ Hard reset cancelled."));
    console.log();
  }
}
