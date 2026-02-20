import { IDEAdapter } from '../shared/types';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

export class ClaudeCodeAdapter implements IDEAdapter {
  private connected: boolean = false;
  private projectPath: string;
  private claudeModel: string;
  private currentProcess: ChildProcess | null = null;
  private currentSessionId: string | null = null;

  constructor() {
    this.projectPath = process.env.PROJECT_PATH || process.cwd();
    this.claudeModel = process.env.CLAUDE_MODEL || 'sonnet';
  }

  async connect(): Promise<void> {
    console.log(chalk.cyan('\n🔍 Checking prerequisites...\n'));

    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('claude --version', (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      console.log(chalk.green('✅ Claude CLI installed'));
    } catch (error) {
      throw new Error(
        '❌ Claude CLI not installed.\n\n' +
        'Please install Claude CLI first.\n' +
        'Visit: https://claude.ai'
      );
    }

    console.log(chalk.green(`\n✅ Connected to Claude Code (Official)`));
    console.log(chalk.gray(`   Project: ${this.projectPath}`));
    console.log(chalk.gray(`   Model: ${this.claudeModel}`));
    console.log(chalk.gray(`   Mode: Anthropic API\n`));

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

    console.log(chalk.blue(`\n🤖 Processing with Claude Code (Official)...`));
    console.log(chalk.gray(`   Model: ${this.claudeModel}`));
    console.log(chalk.gray(`   Instruction: ${instruction.substring(0, 60)}${instruction.length > 60 ? '...' : ''}\n`));

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = '';
      let errorOutput = '';

      const args: string[] = [];

      if (this.currentSessionId) {
        args.push('--resume', this.currentSessionId);
      } else {
        this.currentSessionId = randomUUID();
        args.push('--session-id', this.currentSessionId);
      }

      args.push('--permission-mode', 'bypassPermissions');
      args.push('--model', this.claudeModel);

      const systemPrompt = this.loadSystemPrompt();
      args.push('--append-system-prompt', systemPrompt);
      args.push(instruction);

      console.log(chalk.cyan(`📡 Spawning Claude CLI...`));
      console.log(chalk.gray(`   Command: claude ${args.join(' ')}`));
      console.log(chalk.gray(`   Working directory: ${this.projectPath}\n`));

      const child = spawn('claude', args, {
        cwd: this.projectPath,
        env: process.env,
        stdio: ['inherit', 'pipe', 'pipe']
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

        if (code === 0) {
          console.log(chalk.green(`\n✅ Command executed successfully!`));
          console.log(chalk.gray(`   Time taken: ${elapsed}s\n`));
          resolve(this.formatResponse(output));
        } else {
          console.error(chalk.red(`\n❌ Process exited with code ${code}\n`));
          reject(new Error(errorOutput || `Process exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        this.currentProcess = null;
        console.error(chalk.red(`\n❌ Failed to spawn Claude CLI\n`));
        
        if (error.message.includes('ENOENT')) {
          reject(new Error(
            '❌ Claude CLI not found in PATH.\n\n' +
            'Please install Claude CLI first.\n' +
            'Visit: https://claude.ai'
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

    return `✅ Claude Code (Official)
    
📁 Project: ${path.basename(this.projectPath)}
🤖 Model: ${this.claudeModel}
🏠 Backend: Anthropic API
💰 Cost: Paid (API usage)
🔒 Privacy: Cloud-based
🔧 Session: ${this.currentSessionId || 'None'}`;
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
