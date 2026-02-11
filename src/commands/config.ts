import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { loadConfig } from './auth';

export async function configCommand() {
  const existingConfig = loadConfig();
  
  if (!existingConfig) {
    console.log(chalk.yellow('\n⚠️  No configuration found.\n'));
    console.log(chalk.white('Please run: ' + chalk.bold.cyan('opencode auth') + ' first.\n'));
    return;
  }

  console.log(chalk.blue.bold('\n🔧 OpenCode Configuration\n'));
  console.log(chalk.gray('Update your OpenCode settings\n'));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'Select messaging platform:',
      choices: ['whatsapp', 'telegram'],
      default: existingConfig.platform
    },
    {
      type: 'input',
      name: 'telegramToken',
      message: 'Enter Telegram Bot Token:',
      when: (answers) => answers.platform === 'telegram',
      default: existingConfig.telegramToken
    },
    {
      type: 'list',
      name: 'ideType',
      message: 'Select your IDE:',
      choices: [
        { name: 'Claude Code (Official - Anthropic API)', value: 'claude-code' },
        { name: 'Claude Code (Ollama - Local & Free)', value: 'ollama-claude-code' }
      ],
      default: existingConfig.ideType
    },
    {
      type: 'list',
      name: 'aiProvider',
      message: 'Select AI provider:',
      choices: ['anthropic', 'openai'],
      default: existingConfig.aiProvider
    },
    {
      type: 'password',
      name: 'aiApiKey',
      message: 'Enter AI API Key:',
      mask: '*',
      default: existingConfig.aiApiKey
    }
  ]);

  const envContent = `PLATFORM=${answers.platform}
TELEGRAM_BOT_TOKEN=${answers.telegramToken || ''}
IDE_TYPE=${answers.ideType}
IDE_PORT=3000
ALLOWED_USERS=
AI_API_KEY=${answers.aiApiKey}
AI_PROVIDER=${answers.aiProvider}
`;

  const envPath = path.join(process.cwd(), '.env');
  fs.writeFileSync(envPath, envContent);

  console.log(chalk.green('\n✅ Configuration updated'));
}
