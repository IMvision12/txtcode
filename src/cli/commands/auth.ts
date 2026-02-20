import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import modelsCatalog from '../../data/models-catalog.json';
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

const CONFIG_DIR = path.join(os.homedir(), '.txtcode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

async function authenticateWhatsApp(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let sock: any = null;
    let pairingComplete = false;
    
    try {
      const { state, saveCreds } = await useMultiFileAuthState('.wacli_auth');
      
      sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: {
          level: 'silent',
          fatal: () => {},
          error: () => {},
          warn: () => {},
          info: () => {},
          debug: () => {},
          trace: () => {},
          child: () => ({
            level: 'silent',
            fatal: () => {},
            error: () => {},
            warn: () => {},
            info: () => {},
            debug: () => {},
            trace: () => {},
          }),
        } as any,
      });

      let hasShownQR = false;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update: any) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr && !hasShownQR) {
          hasShownQR = true;
          console.log(chalk.yellow('\n[QR] Scan this QR code with WhatsApp:\n'));
          qrcode.generate(qr, { small: true });
          console.log(chalk.gray('\nOpen WhatsApp → Settings → Linked Devices → Link a Device\n'));
        }

        if (connection === 'open' && !pairingComplete) {
          pairingComplete = true;
          console.log(chalk.green('\n[OK] WhatsApp authenticated successfully!'));
          
          // Close socket and resolve
          setTimeout(() => {
            try {
              sock.ws?.close();
            } catch (e) {
              // Ignore
            }
            resolve();
          }, 500);
        }

        if (connection === 'close' && !pairingComplete) {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          
          // 515 means pairing successful but needs restart - OpenClaw pattern
          if (statusCode === 515 && hasShownQR) {
            console.log(chalk.cyan('\n[INFO] WhatsApp pairing complete, restarting connection...\n'));
            
            try {
              sock.ws?.close();
            } catch (e) {
              // Ignore
            }
            
            // Restart connection without QR
            const { state: newState, saveCreds: newSaveCreds } = await useMultiFileAuthState('.wacli_auth');
            const retrySock = makeWASocket({
              auth: newState,
              printQRInTerminal: false,
              logger: {
                level: 'silent',
                fatal: () => {},
                error: () => {},
                warn: () => {},
                info: () => {},
                debug: () => {},
                trace: () => {},
                child: () => ({
                  level: 'silent',
                  fatal: () => {},
                  error: () => {},
                  warn: () => {},
                  info: () => {},
                  debug: () => {},
                  trace: () => {},
                }),
              } as any,
            });
            
            retrySock.ev.on('creds.update', newSaveCreds);
            
            retrySock.ev.on('connection.update', async (retryUpdate: any) => {
              if (retryUpdate.connection === 'open') {
                pairingComplete = true;
                console.log(chalk.green('[OK] WhatsApp linked successfully!\n'));
                
                // Close and resolve
                setTimeout(() => {
                  try {
                    retrySock.ws?.close();
                  } catch (e) {
                    // Ignore
                  }
                  resolve();
                }, 500);
              }
              
              if (retryUpdate.connection === 'close') {
                try {
                  retrySock.ws?.close();
                } catch (e) {
                  // Ignore
                }
                reject(new Error('WhatsApp authentication failed after restart'));
              }
            });
          } else if (hasShownQR && statusCode !== 515) {
            // Other errors after showing QR
            try {
              sock.ws?.close();
            } catch (e) {
              // Ignore
            }
            reject(new Error(`WhatsApp authentication failed (code: ${statusCode})`));
          }
        }
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        if (!pairingComplete) {
          try {
            sock.ws?.close();
          } catch (e) {
            // Ignore
          }
          reject(new Error('WhatsApp authentication timeout'));
        }
      }, 120000);
    } catch (error) {
      if (sock) {
        try {
          sock.ws?.close();
        } catch (e) {
          // Ignore
        }
      }
      reject(error);
    }
  });
}

export async function authCommand() {
  console.log(chalk.blue.bold('\nTxtCode Authentication\n'));
  console.log(chalk.gray('Configure your TxtCode CLI for remote IDE control\n'));

  // Step 1: AI Provider
  const aiAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'aiProvider',
      message: 'Select AI provider:',
      choices: [
        { name: 'Anthropic (Claude)', value: 'anthropic' },
        { name: 'OpenAI (GPT)', value: 'openai' },
        { name: 'Google (Gemini)', value: 'gemini' }
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

  console.log(chalk.green('\nAI provider configured\n'));

  // Load models from catalog
  const providerModels = modelsCatalog.providers[aiAnswers.aiProvider as keyof typeof modelsCatalog.providers];
  const modelChoices = providerModels.models.map((model: any) => ({
    name: model.recommended 
      ? `${model.name} (${model.description}) - Recommended`
      : `${model.name} (${model.description})`,
    value: model.id
  }));

  const modelAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'model',
      message: 'Select model:',
      choices: modelChoices,
      default: modelChoices[0]?.value,
      pageSize: 10
    }
  ]);

  console.log(chalk.green(`\nModel selected: ${modelAnswer.model}\n`));

  // Step 2: Messaging Platform
  const platformAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'Select messaging platform:',
      choices: [
        { name: 'WhatsApp', value: 'whatsapp' },
        { name: 'Telegram', value: 'telegram' },
        { name: 'Discord', value: 'discord' }
      ],
      default: 'whatsapp'
    }
  ]);

  let telegramToken = '';
  let discordToken = '';
  let authorizedUserId = '';

  // Complete messaging platform auth immediately
  if (platformAnswers.platform === 'telegram') {
    console.log(chalk.cyan('\nTelegram Bot Setup\n'));
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
    console.log(chalk.green('\nTelegram bot configured\n'));
  } else if (platformAnswers.platform === 'discord') {
    console.log(chalk.cyan('\nDiscord Bot Setup\n'));
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
    console.log(chalk.green('\nDiscord bot configured\n'));
  } else {
    console.log(chalk.cyan('\nWhatsApp Setup\n'));
    
    // Authenticate WhatsApp immediately
    console.log(chalk.cyan('Authenticating WhatsApp...\n'));
    await authenticateWhatsApp();
    console.log(chalk.green('\nWhatsApp authenticated successfully!\n'));
  }

  // Step 3: Coding Adapter Selection
  const ideAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'ideType',
      message: 'Select coding adapter:',
      choices: [
        { name: 'Claude Code (Anthropic API)', value: 'claude-code' },
        { name: 'Gemini Code (Google AI API)', value: 'gemini-code' },
        { name: 'Ollama Claude Code (Local, Free)', value: 'ollama-claude-code' }
      ],
      default: 'ollama-claude-code'
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
    aiModel: modelAnswer.model,
    platform: platformAnswers.platform,
    telegramToken: telegramToken,
    discordToken: discordToken,
    authorizedUserId: authorizedUserId,
    ideType: ideAnswers.ideType,
    idePort: 3000,
    authorizedUser: '', // Will be set on first message
    configuredAt: new Date().toISOString()
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  console.log(chalk.green('\nAuthentication successful!'));
  console.log(chalk.gray(`\nConfiguration saved to: ${CONFIG_FILE}`));
  console.log(chalk.cyan('\nNext steps:'));
  console.log(chalk.white('  1. Run: ' + chalk.bold('txtcode start')));
  
  if (platformAnswers.platform === 'telegram') {
    console.log(chalk.white('  2. Message your Telegram bot'));
  } else if (platformAnswers.platform === 'discord') {
    console.log(chalk.white('  2. Invite bot to your server and mention it'));
  } else if (platformAnswers.platform === 'whatsapp') {
    console.log(chalk.white('  2. Send a message from your authorized number'));
  }
  
  console.log(chalk.white('  3. Start coding from your phone!\n'));
  
  // Force exit to ensure terminal closes (WhatsApp socket may have lingering listeners)
  setTimeout(() => {
    process.exit(0);
  }, 100);
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
