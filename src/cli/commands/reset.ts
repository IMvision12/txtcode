import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import chalk from "chalk";

const CONFIG_DIR = path.join(os.homedir(), ".txtcode");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const WA_AUTH_DIR = path.join(CONFIG_DIR, ".wacli_auth");

export function resetCommand() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      console.log(chalk.red("\n❌ Config file not found.\n"));
      console.log(chalk.yellow('Run "txtcode auth" to set up first.\n'));
      return;
    }

    let config;
    try {
      const configData = fs.readFileSync(CONFIG_FILE, "utf-8");
      config = JSON.parse(configData);
    } catch (parseError) {
      console.log(chalk.red("\n❌ Config file is corrupted.\n"));
      console.log(chalk.yellow('Run "txtcode auth" to reconfigure.\n'));
      return;
    }

    config.authorizedUser = "";
    
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
      console.log(chalk.green("\n✅ Authorized user reset!"));
      console.log(chalk.cyan("The next person to message will become the authorized user.\n"));
    } catch (writeError) {
      console.log(chalk.red("\n❌ Failed to save config file.\n"));
    }
  } catch (error) {
    console.log(chalk.red("\n❌ Failed to reset. Unexpected error.\n"));
  }
}

export function logoutCommand() {
  try {
    if (fs.existsSync(WA_AUTH_DIR)) {
      fs.rmSync(WA_AUTH_DIR, { recursive: true, force: true });
      console.log(chalk.green("\n✅ WhatsApp session deleted!"));
      console.log(chalk.cyan('Run "txtcode start" to scan QR code again.\n'));
    } else {
      console.log(chalk.yellow("\n⚠️ No WhatsApp session found.\n"));
    }
  } catch (error) {
    console.log(chalk.red("\n❌ Failed to delete session.\n"));
  }
}

export function hardResetCommand() {
  console.log(chalk.yellow("\n⚠️  HARD RESET - This will delete ALL TxtCode data:\n"));
  console.log(chalk.gray("  • Configuration file (~/.txtcode/config.json)"));
  console.log(chalk.gray("  • WhatsApp authentication (~/.txtcode/.wacli_auth)"));
  console.log(chalk.gray("  • All settings and authorized users\n"));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(chalk.red('Are you sure? Type "yes" to confirm: '), (answer: string) => {
    rl.close();

    if (answer.toLowerCase() === "yes") {
      let deletedItems = 0;

      try {
        if (fs.existsSync(CONFIG_DIR)) {
          fs.rmSync(CONFIG_DIR, { recursive: true, force: true });
          console.log(chalk.green("✓ Deleted configuration directory"));
          deletedItems++;
        }
      } catch (error) {
        console.log(chalk.red("✗ Failed to delete configuration directory"));
      }

      if (deletedItems > 0) {
        console.log(chalk.green(`\n✅ Hard reset complete! Deleted ${deletedItems} item(s).`));
        console.log(chalk.cyan('\nRun "txtcode auth" to set up again.\n'));
      } else {
        console.log(chalk.yellow("\n⚠️ No data found to delete.\n"));
      }
    } else {
      console.log(chalk.yellow("\n❌ Hard reset cancelled.\n"));
    }
  });
}
