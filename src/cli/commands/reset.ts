import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import readline from 'readline';

const CONFIG_DIR = path.join(os.homedir(), '.txtcode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const WA_AUTH_DIR = path.join(CONFIG_DIR, '.wacli_auth');

export function resetCommand() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    config.authorizedUser = '';
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(chalk.green('\n✅ Authorized user reset!'));
    console.log(chalk.cyan('The next person to message will become the authorized user.\n'));
  } catch (error) {
    console.log(chalk.red('\n❌ Failed to reset. Config file not found.\n'));
  }
}

export function logoutCommand() {
  try {
    if (fs.existsSync(WA_AUTH_DIR)) {
      fs.rmSync(WA_AUTH_DIR, { recursive: true, force: true });
      console.log(chalk.green('\n✅ WhatsApp session deleted!'));
      console.log(chalk.cyan('Run "txtcode start" to scan QR code again.\n'));
    } else {
      console.log(chalk.yellow('\n⚠️ No WhatsApp session found.\n'));
    }
  } catch (error) {
    console.log(chalk.red('\n❌ Failed to delete session.\n'));
  }
}

export function hardResetCommand() {
  console.log(chalk.yellow('\n⚠️  HARD RESET - This will delete ALL TxtCode data:\n'));
  console.log(chalk.gray('  • Configuration file (~/.txtcode/config.json)'));
  console.log(chalk.gray('  • WhatsApp authentication (~/.txtcode/.wacli_auth)'));
  console.log(chalk.gray('  • All settings and authorized users\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(chalk.red('Are you sure? Type "yes" to confirm: '), (answer: string) => {
    rl.close();

    if (answer.toLowerCase() === 'yes') {
      let deletedItems = 0;

      try {
        if (fs.existsSync(CONFIG_DIR)) {
          fs.rmSync(CONFIG_DIR, { recursive: true, force: true });
          console.log(chalk.green('✓ Deleted configuration directory'));
          deletedItems++;
        }
      } catch (error) {
        console.log(chalk.red('✗ Failed to delete configuration directory'));
      }

      if (deletedItems > 0) {
        console.log(chalk.green(`\n✅ Hard reset complete! Deleted ${deletedItems} item(s).`));
        console.log(chalk.cyan('\nRun "txtcode auth" to set up again.\n'));
      } else {
        console.log(chalk.yellow('\n⚠️ No data found to delete.\n'));
      }
    } else {
      console.log(chalk.yellow('\n❌ Hard reset cancelled.\n'));
    }
  });
}
