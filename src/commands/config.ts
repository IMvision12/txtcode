import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { loadConfig } from './auth';

const CONFIG_DIR = path.join(os.homedir(), '.agentcode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export async function configCommand() {
  const existingConfig = loadConfig();
  
  if (!existingConfig) {
    console.log(chalk.yellow('\n⚠️  No configuration found.\n'));
    console.log(chalk.white('Please run: ' + chalk.bold.cyan('agentcode auth') + ' first.\n'));
    return;
  }

  console.log(chalk.blue.bold('\n🔧 AgentCode Configuration\n'));
  console.log(chalk.gray('What would you like to change?\n'));

  const { configType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'configType',
      message: 'Select what to configure:',
      choices: [
        { name: '📱 Change Messaging Platform', value: 'platform' },
        { name: '🤖 Change IDE Type', value: 'ide' },
        { name: '🧠 Change AI Provider', value: 'ai' },
        { name: '📁 Change Project Path', value: 'project' },
        { name: '📊 View Current Config', value: 'view' },
        { name: '🔙 Cancel', value: 'cancel' }
      ]
    }
  ]);

  if (configType === 'cancel') {
    console.log(chalk.gray('\nCancelled.\n'));
    return;
  }

  switch (configType) {
    case 'platform':
      await configurePlatform(existingConfig);
      break;
    case 'ide':
      await configureIDE(existingConfig);
      break;
    case 'ai':
      await configureAI(existingConfig);
      break;
    case 'project':
      await configureProject(existingConfig);
      break;
    case 'view':
      viewConfig(existingConfig);
      break;
  }
}

async function configurePlatform(config: any) {
  console.log(chalk.cyan('\n📱 Messaging Platform Configuration\n'));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'Select messaging platform:',
      choices: [
        { name: '📱 WhatsApp', value: 'whatsapp' },
        { name: '✈️  Telegram', value: 'telegram' },
        { name: '💬 Discord', value: 'discord' }
      ],
      default: config.platform
    }
  ]);

  config.platform = answers.platform;

  // Get tokens if needed
  if (answers.platform === 'telegram') {
    const { token } = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Enter Telegram Bot Token:',
        mask: '*',
        default: config.telegramToken
      }
    ]);
    config.telegramToken = token;
  } else if (answers.platform === 'discord') {
    const { token } = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Enter Discord Bot Token:',
        mask: '*',
        default: config.discordToken
      }
    ]);
    config.discordToken = token;
  }

  saveConfig(config);
  console.log(chalk.green('\n✅ Platform configuration updated!\n'));
}

async function configureIDE(config: any) {
  console.log(chalk.cyan('\n🤖 IDE Configuration\n'));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'ideType',
      message: 'Select IDE type:',
      choices: [
        { name: 'Claude Code (Official - Anthropic API)', value: 'claude-code' },
        { name: 'Claude Code (Ollama - Local & Free)', value: 'ollama-claude-code' },
        { name: 'Gemini Code (Google AI API)', value: 'gemini-code' }
      ],
      default: config.ideType
    }
  ]);

  config.ideType = answers.ideType;

  // Ask for model based on IDE type
  if (answers.ideType === 'claude-code') {
    const { model } = await inquirer.prompt([
      {
        type: 'input',
        name: 'model',
        message: 'Claude model (sonnet, opus, haiku):',
        default: config.claudeModel || 'sonnet'
      }
    ]);
    config.claudeModel = model;
  } else if (answers.ideType === 'ollama-claude-code') {
    const { model } = await inquirer.prompt([
      {
        type: 'input',
        name: 'model',
        message: 'Ollama model:',
        default: config.ollamaModel || 'gpt-oss:20b'
      }
    ]);
    config.ollamaModel = model;
  } else if (answers.ideType === 'gemini-code') {
    const { model } = await inquirer.prompt([
      {
        type: 'input',
        name: 'model',
        message: 'Gemini model (leave empty for default):',
        default: config.geminiModel || ''
      }
    ]);
    config.geminiModel = model;
  }

  saveConfig(config);
  console.log(chalk.green('\n✅ IDE configuration updated!\n'));
}

async function configureAI(config: any) {
  console.log(chalk.cyan('\n🧠 AI Provider Configuration\n'));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'aiProvider',
      message: 'Select AI provider for general chat:',
      choices: [
        { name: '🧠 Anthropic (Claude)', value: 'anthropic' },
        { name: '🤖 OpenAI (GPT)', value: 'openai' },
        { name: '💎 Google (Gemini)', value: 'gemini' }
      ],
      default: config.aiProvider
    },
    {
      type: 'password',
      name: 'aiApiKey',
      message: 'Enter AI API Key:',
      mask: '*',
      default: config.aiApiKey
    }
  ]);

  config.aiProvider = answers.aiProvider;
  config.aiApiKey = answers.aiApiKey;

  saveConfig(config);
  console.log(chalk.green('\n✅ AI provider configuration updated!\n'));
}

async function configureProject(config: any) {
  console.log(chalk.cyan('\n📁 Project Path Configuration\n'));

  const { projectPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectPath',
      message: 'Enter your project path:',
      default: config.projectPath || process.cwd()
    }
  ]);

  config.projectPath = projectPath;

  saveConfig(config);
  console.log(chalk.green('\n✅ Project path updated!\n'));
}

function viewConfig(config: any) {
  console.log(chalk.cyan('\n📋 Current Configuration\n'));
  console.log(chalk.white('Platform:'), chalk.yellow(config.platform));
  console.log(chalk.white('IDE Type:'), chalk.yellow(config.ideType));
  console.log(chalk.white('AI Provider:'), chalk.yellow(config.aiProvider));
  
  if (config.projectPath) {
    console.log(chalk.white('Project Path:'), chalk.yellow(config.projectPath));
  }
  
  if (config.ollamaModel) {
    console.log(chalk.white('Ollama Model:'), chalk.yellow(config.ollamaModel));
  }
  
  if (config.claudeModel) {
    console.log(chalk.white('Claude Model:'), chalk.yellow(config.claudeModel));
  }
  
  if (config.geminiModel) {
    console.log(chalk.white('Gemini Model:'), chalk.yellow(config.geminiModel));
  }
  
  if (config.authorizedUser) {
    console.log(chalk.white('Authorized User:'), chalk.yellow(config.authorizedUser));
  }
  
  console.log(chalk.white('Configured At:'), chalk.yellow(new Date(config.configuredAt).toLocaleString()));
  console.log(chalk.gray(`\nConfig file: ${CONFIG_FILE}\n`));
}

function saveConfig(config: any) {
  config.updatedAt = new Date().toISOString();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

