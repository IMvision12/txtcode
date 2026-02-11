import { IDEAdapter } from '../bridge';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import chalk from 'chalk';
import path from 'path';

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

    // Check if Ollama is installed
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

    // Check if Ollama is running and model is available
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
      
      // Check if configured model exists
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

      // Prepare arguments for ollama launch claude
      const args: string[] = ['launch', 'claude', '--model', this.ollamaModel];

      // Add extra args for Claude CLI after --
      const claudeArgs: string[] = [];

      // Session management - resume if we have a session, otherwise create new
      if (this.currentSessionId) {
        claudeArgs.push('--resume', this.currentSessionId);
      } else {
        // Generate new session ID
        this.currentSessionId = randomUUID();
        claudeArgs.push('--session-id', this.currentSessionId);
      }

      // Auto-approve all operations using permission mode
      claudeArgs.push('--permission-mode', 'bypassPermissions');

      // Add system prompt to make it more action-oriented
      claudeArgs.push('--append-system-prompt', 
        'You are a code assistant that takes immediate action. When asked to create, modify, delete, or RUN files, do it immediately without asking for confirmation or clarification. Execute the task directly. If asked to run code, use the Bash tool to execute it. For Python files, use "python filename.py". For Node.js, use "node filename.js". Always execute when asked to run. IMPORTANT: When you run code, always include the complete output/result in your response to the user.');

      // Add the instruction as the prompt argument (last argument)
      claudeArgs.push(instruction);

      // Add Claude args after --
      if (claudeArgs.length > 0) {
        args.push('--', ...claudeArgs);
      }

      console.log(chalk.cyan(`📡 Spawning Ollama Claude Code...`));
      console.log(chalk.gray(`   Command: ollama ${args.join(' ')}`));
      console.log(chalk.gray(`   Working directory: ${this.projectPath}\n`));

      // Spawn Ollama process
      const child = spawn('ollama', args, {
        cwd: this.projectPath,
        env: process.env,
        stdio: ['inherit', 'pipe', 'pipe']
      });

      this.currentProcess = child;

      // Capture stdout
      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        // Log progress
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

        if (code === 0) {
          console.log(chalk.green(`\n✅ Command executed successfully!`));
          console.log(chalk.gray(`   Time taken: ${elapsed}s\n`));
          resolve(this.formatResponse(output));
        } else {
          console.error(chalk.red(`\n❌ Process exited with code ${code}\n`));
          reject(new Error(errorOutput || `Process exited with code ${code}`));
        }
      });

      // Handle errors
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

  private formatResponse(output: string): string {
    // Clean up the output
    let formatted = output.trim();

    // Remove ANSI color codes if present
    formatted = formatted.replace(/\x1b\[[0-9;]*m/g, '');

    // Truncate if too long (for messaging apps)
    const maxLength = 2000;
    if (formatted.length > maxLength) {
      formatted = formatted.substring(0, maxLength) + '\n\n... (output truncated)';
    }

    return formatted || 'Task completed successfully.';
  }
}
