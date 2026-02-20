import { IDEAdapter } from '../shared/types';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

export class OllamaClaudeCodeAdapter implements IDEAdapter {
  private connected: boolean = false;
  private projectPath: string;
  private ollamaModel: string;
  private currentProcess: ChildProcess | null = null;
  private currentSessionId: string | null = null;

  constructor() {
    this.projectPath = process.env.PROJECT_PATH || process.cwd();
    this.ollamaModel = process.env.OLLAMA_MODEL || 'gpt-oss:20b';
  }

  async connect(): Promise<void> {
    console.log(chalk.cyan('\n🔍 Checking prerequisites...\n'));

    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('ollama --version', (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      console.log(chalk.green('✅ Ollama installed'));
    } catch (error) {
      throw new Error(
        '❌ Ollama not installed.\n\n' +
        'Please install Ollama first.\n' +
        'Visit: https://ollama.com'
      );
    }

    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        throw new Error('Ollama not responding');
      }
      
      const data: any = await response.json();
      const models = data.models || [];
      
      if (models.length === 0) {
        throw new Error('No models found. Please pull a model first.');
      }
      
      const modelExists = models.some((m: any) => m.name === this.ollamaModel);
      if (!modelExists) {
        console.log(chalk.yellow(`⚠️  Model ${this.ollamaModel} not found`));
        console.log(chalk.cyan(`   Available models: ${models.map((m: any) => m.name).join(', ')}`));
        throw new Error(`Model ${this.ollamaModel} not available`);
      }
      
      console.log(chalk.green('✅ Ollama running'));
      console.log(chalk.green(`✅ Model ${this.ollamaModel} available`));
    } catch (error) {
      throw new Error(
        `❌ Ollama setup failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
        'Make sure:\n' +
        '1. Ollama is running: ollama serve\n' +
        '2. Model is available: ollama list'
      );
    }

    console.log(chalk.green(`\n✅ Connected to Claude Code (via Ollama)`));
    console.log(chalk.gray(`   Project: ${this.projectPath}`));
    console.log(chalk.gray(`   Model: ${this.ollamaModel}`));
    console.log(chalk.gray(`   Mode: Ollama Launch\n`));

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

    console.log(chalk.blue(`\n🤖 Processing with Claude Code (via Ollama)...`));
    console.log(chalk.gray(`   Model: ${this.ollamaModel}`));
    console.log(chalk.gray(`   Instruction: ${instruction.substring(0, 60)}${instruction.length > 60 ? '...' : ''}\n`));

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = '';
      let errorOutput = '';

      const args: string[] = ['launch', 'claude', '--model', this.ollamaModel];
      const claudeArgs: string[] = [];

      if (this.currentSessionId) {
        claudeArgs.push('--resume', this.currentSessionId);
      } else {
        this.currentSessionId = randomUUID();
        claudeArgs.push('--session-id', this.currentSessionId);
      }

      claudeArgs.push('--permission-mode', 'bypassPermissions');

      const systemPrompt = this.loadSystemPrompt();
      claudeArgs.push('--append-system-prompt', systemPrompt);
      claudeArgs.push(instruction);

      if (claudeArgs.length > 0) {
        args.push('--', ...claudeArgs);
      }

      console.log(chalk.cyan(`📡 Spawning Ollama Claude Code...`));
      console.log(chalk.gray(`   Command: ollama ${args.join(' ')}`));
      console.log(chalk.gray(`   Working directory: ${this.projectPath}\n`));

      const child = spawn('ollama', args, {
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
        console.error(chalk.red(`\n❌ Failed to spawn Ollama\n`));
        
        if (error.message.includes('ENOENT')) {
          reject(new Error(
            '❌ Ollama not found in PATH.\n\n' +
            'Please install Ollama first.\n' +
            'Visit: https://ollama.com'
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

    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data: any = await response.json();
      const models = data.models || [];
      
      return `✅ Claude Code (via Ollama Launch)
      
📁 Project: ${path.basename(this.projectPath)}
🤖 Model: ${this.ollamaModel}
🏠 Backend: Ollama (Local)
💰 Cost: Free
🔒 Privacy: 100% Local
🔧 Session: ${this.currentSessionId || 'None'}
📊 Available models: ${models.length}`;
    } catch {
      return '⚠️ Ollama service not running. Start with: ollama serve';
    }
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
