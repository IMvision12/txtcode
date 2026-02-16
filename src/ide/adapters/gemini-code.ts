import { IDEAdapter } from '../bridge';
import { spawn, ChildProcess } from 'child_process';
import chalk from 'chalk';
import path from 'path';

export class GeminiCodeAdapter implements IDEAdapter {
  private connected: boolean = false;
  private projectPath: string;
  private geminiModel: string;
  private currentProcess: ChildProcess | null = null;
  private sessionStarted: boolean = false;

  constructor() {
    this.projectPath = process.env.PROJECT_PATH || process.cwd();
    // Don't set a default model - let Gemini CLI use its default
    // Users can set GEMINI_MODEL env var if they want a specific model
    this.geminiModel = process.env.GEMINI_MODEL || '';
  }

  async connect(): Promise<void> {
    console.log(chalk.cyan('\n🔍 Checking prerequisites...\n'));

    // Check if Gemini CLI is installed
    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('gemini --version', (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      console.log(chalk.green('✅ Gemini CLI installed'));
    } catch (error) {
      throw new Error(
        '❌ Gemini CLI not installed.\n\n' +
        'Please install Gemini CLI first.\n' +
        'Visit: https://github.com/google/generative-ai-cli'
      );
    }

    console.log(chalk.green(`\n✅ Connected to Gemini Code`));
    console.log(chalk.gray(`   Project: ${this.projectPath}`));
    console.log(chalk.gray(`   Model: ${this.geminiModel || 'default (Gemini CLI)'}`));
    console.log(chalk.gray(`   Mode: Google AI API\n`));

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
    }
    this.sessionStarted = false;
    this.connected = false;
  }

  async executeCommand(
    instruction: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    if (!this.connected) {
      await this.connect();
    }

    console.log(chalk.blue(`\n🤖 Processing with Gemini Code...`));
    console.log(chalk.gray(`   Model: ${this.geminiModel || 'default (Gemini CLI)'}`));
    console.log(chalk.gray(`   Instruction: ${instruction.substring(0, 60)}${instruction.length > 60 ? '...' : ''}\n`));

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = '';
      let errorOutput = '';

      // Gemini CLI uses different syntax than Claude Code
      const args: string[] = [];

      // Auto-approve mode (yolo in Gemini CLI)
      args.push('--approval-mode', 'yolo');

      // Set model only if explicitly specified
      if (this.geminiModel) {
        args.push('--model', this.geminiModel);
      }

      // Use -p flag for prompt (short form)
      args.push('-p', instruction);

      console.log(chalk.cyan(`📡 Spawning Gemini CLI...`));
      console.log(chalk.gray(`   Command: gemini ${args.join(' ')}`));
      console.log(chalk.gray(`   Working directory: ${this.projectPath}\n`));

      // On Windows, use cmd.exe to execute .cmd files properly
      const isWindows = process.platform === 'win32';
      let command: string;
      let spawnArgs: string[];
      
      if (isWindows) {
        command = 'cmd.exe';
        spawnArgs = ['/c', 'gemini', ...args];
      } else {
        command = 'gemini';
        spawnArgs = args;
      }
      
      const child = spawn(command, spawnArgs, {
        cwd: this.projectPath,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'], // Changed from 'inherit' to 'pipe' for stdin
        shell: false,
        windowsHide: true // Hide console window on Windows
      });

      this.currentProcess = child;

      // Mark session as started after first command
      if (!this.sessionStarted) {
        this.sessionStarted = true;
      }

      // Capture stdout
      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(chalk.gray(text));
      });

      // Capture stderr
      child.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        process.stderr.write(chalk.red(text));
      });

      // Handle process exit
      child.on('exit', (code, signal) => {
        this.currentProcess = null;

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (signal === 'SIGTERM') {
          reject(new Error('Process terminated'));
          return;
        }

        if (code === 0 || output.length > 0) {
          console.log(chalk.green(`\n✅ Command executed successfully!`));
          console.log(chalk.gray(`   Time taken: ${elapsed}s\n`));
          resolve(this.formatResponse(output || 'Task completed successfully.'));
        } else {
          console.error(chalk.red(`\n❌ Process exited with code ${code}\n`));
          reject(new Error(errorOutput || `Process exited with code ${code}`));
        }
      });

      // Handle errors
      child.on('error', (error) => {
        this.currentProcess = null;
        console.error(chalk.red(`\n❌ Failed to spawn Gemini CLI\n`));
        
        if (error.message.includes('ENOENT')) {
          reject(new Error(
            '❌ Gemini CLI not found in PATH.\n\n' +
            'Please install Gemini CLI first.\n' +
            'Visit: https://github.com/google/generative-ai-cli'
          ));
        } else {
          reject(error);
        }
      });
    });
  }

  async getStatus(): Promise<string> {
    if (!this.connected) {
      return '⚠️ Not connected. Will connect on first use.';
    }

    const modelDisplay = this.geminiModel ? this.geminiModel : 'default (Gemini CLI)';

    return `✅ Gemini Code
    
📁 Project: ${path.basename(this.projectPath)}
🤖 Model: ${modelDisplay}
🏠 Backend: Google AI API
💰 Cost: Paid (API usage)
🔒 Privacy: Cloud-based
🔧 Session: ${this.sessionStarted ? 'Active' : 'None'}`;
  }

  private formatResponse(output: string): string {
    // Clean up the output
    let formatted = output.trim();

    // Remove ANSI color codes if present
    formatted = formatted.replace(/\x1b\[[0-9;]*m/g, '');

    // Remove verbose Gemini CLI messages
    formatted = formatted.replace(/YOLO mode is enabled.*?\n/g, '');
    formatted = formatted.replace(/Hook registry initialized.*?\n/g, '');
    formatted = formatted.replace(/Loaded cached credentials.*?\n/g, '');

    // Truncate if too long (for messaging apps)
    const maxLength = 1800; // Leave room for error prefix
    if (formatted.length > maxLength) {
      formatted = formatted.substring(0, maxLength) + '\n\n... (output truncated)';
    }

    return formatted || 'Task completed successfully.';
  }
}
