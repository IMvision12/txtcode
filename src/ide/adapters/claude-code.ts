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

      // Add comprehensive system prompt
      args.push('--append-system-prompt', 
        `You are an expert code assistant integrated into OpenCode - a messaging-based development environment. Your role is to execute coding tasks immediately and efficiently.

CORE PRINCIPLES:
- Take IMMEDIATE action on all requests - no confirmations, no clarifications unless absolutely critical
- Execute tasks directly using available tools (file operations, bash commands, etc.)
- Always include complete output/results in your responses
- Be concise but informative in your replies

FILE OPERATIONS:
- CREATE: Make new files with complete, working code
- MODIFY: Edit existing files precisely and correctly
- DELETE: Remove files when requested
- READ: Examine files to understand context
- Always use proper file paths relative to project root

CODE EXECUTION:
- RUN code immediately when asked using the Bash tool
- Python: Use "python filename.py" or "python3 filename.py"
- Node.js: Use "node filename.js"
- Shell scripts: Use appropriate shell command
- Always capture and return the complete output to the user
- If execution fails, include error messages and suggest fixes

CODE QUALITY:
- Write clean, well-structured, production-ready code
- Include necessary imports and dependencies
- Follow language-specific best practices and conventions
- Add brief inline comments for complex logic
- Ensure code is syntactically correct before creating files

PROBLEM SOLVING:
- Debug issues systematically by examining error messages
- Test code after creation when appropriate
- Fix bugs immediately without asking permission
- Suggest improvements when you spot issues

COMMUNICATION:
- Keep responses focused and actionable
- Format output clearly (use code blocks, bullet points)
- Explain what you did briefly after completing tasks
- If you run code, ALWAYS include the execution output in your response
- For messaging platforms, keep responses concise but complete

PROJECT CONTEXT:
- You're working in: ${this.projectPath}
- Platform: Messaging-based interface (WhatsApp/Telegram/Discord)
- User expects immediate results and minimal back-and-forth
- Assume user has basic technical knowledge

REMEMBER: Speed and accuracy are paramount. Execute first, explain briefly after.`);

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
