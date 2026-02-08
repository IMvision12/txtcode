import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const CONFIG_DIR = path.join(os.homedir(), '.opencode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export async function authCommand() {
  console.log(chalk.blue.bold('\n🔐 OpenCode Authentication\n'));
  console.log(chalk.gray('Configure your OpenCode CLI for remote IDE control\n'));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'Select messaging platform:',
      choices: [
        { name: '📱 WhatsApp', value: 'whatsapp' },
        { name: '✈️  Telegram', value: 'telegram' }
      ],
      default: 'whatsapp'
    },
    {
      type: 'input',
      name: 'telegramToken',
      message: 'Enter Telegram Bot Token:',
      when: (answers) => answers.platform === 'telegram',
      validate: (input) => input.length > 0 || 'Token is required'
    },
    {
      type: 'list',
      name: 'ideType',
      message: 'Select your IDE:',
      choices: [
        { name: '🚀 Kiro', value: 'kiro' },
        { name: '📝 VS Code', value: 'vscode' },
        { name: '⚡ Cursor', value: 'cursor' },
        { name: '🌊 Windsurf', value: 'windsurf' },
        { name: '🤖 Claude Code', value: 'claude-code' }
      ],
      default: 'kiro'
    },
    {
      type: 'list',
      name: 'aiProvider',
      message: 'Select AI provider:',
      choices: [
        { name: '🧠 Anthropic (Claude)', value: 'anthropic' },
        { name: '🤖 OpenAI (GPT)', value: 'openai' }
      ],
      default: 'anthropic'
    },
    {
      type: 'password',
      name: 'aiApiKey',
      message: 'Enter AI API Key:',
      mask: '*',
      validate: (input) => input.length > 0 || 'API key is required'
    },
    {
      type: 'input',
      name: 'allowedUsers',
      message: 'Allowed users (comma-separated phone/IDs, leave empty for all):',
      default: ''
    }
  ]);

  // Create config directory
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // Save configuration
  const config = {
    platform: answers.platform,
    telegramToken: answers.telegramToken || '',
    ideType: answers.ideType,
    idePort: 3000,
    allowedUsers: answers.allowedUsers,
    aiApiKey: answers.aiApiKey,
    aiProvider: answers.aiProvider,
    configuredAt: new Date().toISOString()
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  console.log(chalk.green('\n✅ Authentication successful!'));
  console.log(chalk.gray(`\nConfiguration saved to: ${CONFIG_FILE}`));
  console.log(chalk.cyan('\n📱 Next steps:'));
  console.log(chalk.white('  1. Run: ' + chalk.bold('opencode')));
  console.log(chalk.white('  2. Scan QR code (WhatsApp) or message your bot (Telegram)'));
  console.log(chalk.white('  3. Start coding from your phone!\n'));
}

export function loadConfig(): any {
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }
  
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}
