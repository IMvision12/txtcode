import { IDEAdapter } from '../shared/types';
import { spawn, ChildProcess } from 'child_process';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

export class CodexAdapter implements IDEAdapter {
  private connected: boolean = false;
  private projectPath: string;
  private codexModel: string;
  private currentProcess: ChildProcess | null = null;

  constructor() {
    this.projectPath = process.env.PROJECT_PATH || process.cwd();
    this.codexModel = process.env.CODEX_MODEL || 'o4-mini';
  }

  async connect(): Promise<void> {
    console.log(chalk.cyan('\n🔍 Checking prerequisites...\n'));

    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('codex --version', (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      console.log(chalk.green('✅ OpenAI Codex CLI installed'));
    } catch (error) {
      throw new Error(
        '❌ OpenAI Codex CLI not installed.\n\n' +
        'Install it with:\n' +
        '  npm install -g @openai/codex\n\n' +
        'Visit: https://github.com/openai/codex'
      );
    }

    console.log(chalk.green(`\n✅ Connected to OpenAI Codex`));
    console.log(chalk.gray(`   Project: ${this.projectPath}`));
    console.log(chalk.gray(`   Model: ${this.codexModel}`));
    console.log(chalk.gray(`   Mode: OpenAI API\n`));

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
    }
    this.connected = false;
  }

  async executeCommand(
    instruction: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    if (!this.connected) {
      await this.connect();
    }

    console.log(chalk.blue(`\n🤖 Processing with OpenAI Codex...`));
    console.log(chalk.gray(`   Model: ${this.codexModel}`));
    console.log(chalk.gray(`   Instruction: ${instruction.substring(0, 60)}${instruction.length > 60 ? '...' : ''}\n`));

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = '';
      let errorOutput = '';

      const args: string[] = [
        '--approval-mode', 'full-auto',
        '--quiet',
        '--model', this.codexModel,
      ];

      const systemPrompt = this.loadSystemPrompt();
      if (systemPrompt) {
        args.push('--instructions', systemPrompt);
      }

      args.push(instruction);

      console.log(chalk.cyan(`📡 Spawning Codex CLI...`));
      console.log(chalk.gray(`   Command: codex ${args.join(' ')}`));
      console.log(chalk.gray(`   Working directory: ${this.projectPath}\n`));

      const isWindows = process.platform === 'win32';
      let command: string;
      let spawnArgs: string[];

      if (isWindows) {
        command = 'cmd.exe';
        spawnArgs = ['/c', 'codex', ...args];
      } else {
        command = 'codex';
        spawnArgs = args;
      }

      const child = spawn(command, spawnArgs, {
        cwd: this.projectPath,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        windowsHide: true,
      });

      this.currentProcess = child;

      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(chalk.gray(text));
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        process.stderr.write(chalk.red(text));
      });

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

      child.on('error', (error) => {
        this.currentProcess = null;
        console.error(chalk.red(`\n❌ Failed to spawn Codex CLI\n`));

        if (error.message.includes('ENOENT')) {
          reject(new Error(
            '❌ Codex CLI not found in PATH.\n\n' +
            'Install it with:\n' +
            '  npm install -g @openai/codex\n\n' +
            'Visit: https://github.com/openai/codex'
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

    return `✅ OpenAI Codex

📁 Project: ${path.basename(this.projectPath)}
🤖 Model: ${this.codexModel}
🏠 Backend: OpenAI API
💰 Cost: Paid (API usage)
🔒 Privacy: Cloud-based (sandboxed execution)
🔧 Session: Stateless (per-invocation)`;
  }

  private loadSystemPrompt(): string {
    const promptPath = path.join(__dirname, '..', 'data', 'system-prompt.txt');
    try {
      const base = fs.readFileSync(promptPath, 'utf-8');
      return base + `\n- You're working in: ${this.projectPath}`;
    } catch {
      return `You are an expert code assistant. You're working in: ${this.projectPath}`;
    }
  }

  private formatResponse(output: string): string {
    let formatted = output.trim();
    formatted = formatted.replace(/\x1b\[[0-9;]*m/g, '');

    const maxLength = 2000;
    if (formatted.length > maxLength) {
      formatted = formatted.substring(0, maxLength) + '\n\n... (output truncated)';
    }

    return formatted || 'Task completed successfully.';
  }
}
