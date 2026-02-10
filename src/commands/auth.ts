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

  // Step 1: AI Provider
  const aiAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'aiProvider',
      message: 'Select AI provider:',
      choices: [
        { name: '🧠 Anthropic (Claude)', value: 'anthropic' },
        { name: '🤖 OpenAI (GPT)', value: 'openai' },
        { name: '💎 Google (Gemini)', value: 'gemini' }
      ],
      default: 'anthropic'
    },
    {
      type: 'password',
      name: 'aiApiKey',
      message: 'Enter AI API Key:',
      mask: '*',
      validate: (input) => input.length > 0 || 'API key is required'
    }
  ]);

  console.log(chalk.green('\n✅ AI provider configured\n'));

  // Step 2: Messaging Platform
  const platformAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'Select messaging platform:',
      choices: [
        { name: '📱 WhatsApp', value: 'whatsapp' },
        { name: '✈️  Telegram', value: 'telegram' },
        { name: '💬 Discord', value: 'discord' }
      ],
      default: 'whatsapp'
    }
  ]);

  let telegramToken = '';
  let discordToken = '';

  // Complete messaging platform auth immediately
  if (platformAnswers.platform === 'telegram') {
    console.log(chalk.cyan('\n📱 Telegram Bot Setup\n'));
    console.log(chalk.gray('1. Open Telegram and search for @BotFather'));
    console.log(chalk.gray('2. Send /newbot and follow the instructions'));
    console.log(chalk.gray('3. Copy the bot token you receive\n'));

    const telegramAnswers = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Enter Telegram Bot Token:',
        mask: '*',
        validate: (input) => input.length > 0 || 'Token is required'
      }
    ]);

    telegramToken = telegramAnswers.token;
    console.log(chalk.green('\n✅ Telegram bot configured\n'));
  } else if (platformAnswers.platform === 'discord') {
    console.log(chalk.cyan('\n💬 Discord Bot Setup\n'));
    console.log(chalk.gray('1. Go to https://discord.com/developers/applications'));
    console.log(chalk.gray('2. Create a New Application'));
    console.log(chalk.gray('3. Go to Bot → Add Bot'));
    console.log(chalk.gray('4. Copy the bot token'));
    console.log(chalk.gray('5. Enable MESSAGE CONTENT INTENT\n'));

    const discordAnswers = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Enter Discord Bot Token:',
        mask: '*',
        validate: (input) => input.length > 0 || 'Token is required'
      }
    ]);

    discordToken = discordAnswers.token;
    console.log(chalk.green('\n✅ Discord bot configured\n'));
  } else {
    console.log(chalk.cyan('\n📱 WhatsApp Setup\n'));
    console.log(chalk.gray('You will scan a QR code when you start the agent\n'));
    console.log(chalk.green('✅ WhatsApp selected\n'));
  }

  // Step 3: IDE Selection
  const ideAnswers = await inquirer.prompt([
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
    }
  ]);

  // Create config directory
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // Save configuration
  const config = {
    aiProvider: aiAnswers.aiProvider,
    aiApiKey: aiAnswers.aiApiKey,
    platform: platformAnswers.platform,
    telegramToken: telegramToken,
    discordToken: discordToken,
    ideType: ideAnswers.ideType,
    idePort: 3000,
    authorizedUser: '', // Will be set on first message
    configuredAt: new Date().toISOString()
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  console.log(chalk.green('\n✅ Authentication successful!'));
  console.log(chalk.gray(`\nConfiguration saved to: ${CONFIG_FILE}`));
  console.log(chalk.cyan('\n📱 Next steps:'));
  console.log(chalk.white('  1. Run: ' + chalk.bold('opencode start')));
  
  if (platformAnswers.platform === 'whatsapp') {
    console.log(chalk.white('  2. Scan QR code with WhatsApp'));
  } else if (platformAnswers.platform === 'telegram') {
    console.log(chalk.white('  2. Message your Telegram bot'));
  } else if (platformAnswers.platform === 'discord') {
    console.log(chalk.white('  2. Invite bot to your server and mention it'));
  }
  
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
