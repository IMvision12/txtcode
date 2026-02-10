#!/usr/bin/env node
import { Command } from 'commander';
import { configCommand } from './commands/config';
import { agentCommand } from './commands/agent';
import { statusCommand } from './commands/status';
import { authCommand } from './commands/auth';
import { showBanner } from './utils/banner';
import chalk from 'chalk';

// Show banner
showBanner();

const program = new Command();

program
  .name('opencode')
  .description('Remote IDE control via WhatsApp/Telegram')
  .version('0.1.0');

program
  .command('auth')
  .description('Authenticate and configure OpenCode')
  .action(authCommand);

program
  .command('start')
  .description('Start the OpenCode agent')
  .option('-d, --daemon', 'Run as daemon')
  .action(agentCommand);

program
  .command('config')
  .description('Configure OpenCode settings')
  .action(configCommand);

program
  .command('status')
  .description('Check agent status')
  .action(statusCommand);

program
  .command('stop')
  .description('Stop the agent')
  .action(() => {
    console.log(chalk.yellow('Stopping agent...'));
    // TODO: Implement stop logic
  });

program
  .command('reset')
  .description('Reset authorized user')
  .action(() => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const configPath = path.join(os.homedir(), '.opencode', 'config.json');
    
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config.authorizedUser = '';
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.green('\n✅ Authorized user reset!'));
      console.log(chalk.cyan('The next person to message will become the authorized user.\n'));
    } catch (error) {
      console.log(chalk.red('\n❌ Failed to reset. Config file not found.\n'));
    }
  });

program
  .command('logout')
  .description('Logout from WhatsApp (delete session)')
  .action(() => {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const authPath = path.join(process.cwd(), '.wacli_auth');
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log(chalk.green('\n✅ WhatsApp session deleted!'));
        console.log(chalk.cyan('Run "opencode start" to scan QR code again.\n'));
      } else {
        console.log(chalk.yellow('\n⚠️ No WhatsApp session found.\n'));
      }
    } catch (error) {
      console.log(chalk.red('\n❌ Failed to delete session.\n'));
    }
  });

program.parse();
