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

program.parse();
