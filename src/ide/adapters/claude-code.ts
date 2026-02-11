import { IDEAdapter } from '../bridge';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import chalk from 'chalk';
import path from 'path';

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

    // Check if Claude CLI is installed
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
        'Install with:\n' +
        'curl -fsSL https://claude.ai/install.sh | bash\n\n' +
        'Or visit: https://claude.ai'
      );
    }

    // Check if authenticated
    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('claude --help', (error: any) => {
          if (error) reject(error);
          else resolve(true);
        });
      });
      console.log(chalk.green('✅ Claude CLI authenticated'));
    } catch (error) {
      throw new Error(
        '❌ Claude CLI not authenticated.\n\n' +
        'Run: claude setup-token\n' +
        'Or visit: https://claude.ai to get your API key'
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

      // Prepare arguments for Claude CLI
      const args: string[] = [];

      // Session management - resume if we have a session, otherwise create new
      if (this.currentSessionId) {
        args.push('--resume', this.currentSessionId);
      } else {
        // Generate new session ID
        this.currentSessionId = randomUUID();
        args.push('--session-id', this.currentSessionId);
      }

      // Auto-approve all operations using permission mode
      args.push('--permission-mode', 'bypassPermissions');

      // Set model
      args.push('--model', this.claudeModel);

      // Add system prompt to make it more action-oriented
      args.push('--append-system-prompt', 
        'You are a code assistant that takes immediate action. When asked to create, modify, or delete files, do it immediately without asking for confirmation or clarification. Execute the task directly.');

      // Add the instruction as the prompt argument (last argument)
      args.push(instruction);

      console.log(chalk.cyan(`📡 Spawning Claude CLI...`));
      console.log(chalk.gray(`   Command: claude ${args.join(' ')}`));
      console.log(chalk.gray(`   Working directory: ${this.projectPath}\n`));

      // Spawn Claude process
      const child = spawn('claude', args, {
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
        console.error(chalk.red(`\n❌ Failed to spawn Claude CLI\n`));
        
        if (error.message.includes('ENOENT')) {
          reject(new Error(
            '❌ Claude CLI not found in PATH.\n\n' +
            'Install with:\n' +
            'curl -fsSL https://claude.ai/install.sh | bash'
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
