import { IDEAdapter } from '../shared/types';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import { logger } from '../shared/logger';
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
    logger.debug('Checking prerequisites...');

    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('claude --version', (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      logger.debug('Claude CLI installed');
    } catch (error) {
      throw new Error(
        'Claude CLI not installed.\n\n' +
        'Please install Claude CLI first.\n' +
        'Visit: https://claude.ai'
      );
    }

    logger.debug(`Connected to Claude Code (Official)`);
    logger.debug(`   Project: ${this.projectPath}`);
    logger.debug(`   Model: ${this.claudeModel}`);
    logger.debug(`   Mode: Anthropic API`);

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
    }
    this.connected = false;
  }

  abort(): void {
    if (this.currentProcess) {
      logger.debug('Aborting current process...');
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
    }
  }

  async executeCommand(
    instruction: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    signal?: AbortSignal
  ): Promise<string> {
    if (!this.connected) {
      await this.connect();
    }

    logger.debug(`Processing with Claude Code (Official)...`);
    logger.debug(`   Model: ${this.claudeModel}`);
    logger.debug(`   Instruction: ${instruction}`);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = '';
      let errorOutput = '';

      // Handle abort signal
      const abortHandler = () => {
        if (this.currentProcess) {
          logger.debug('Aborting command execution...');
          this.currentProcess.kill('SIGTERM');
          this.currentProcess = null;
        }
        reject(new Error('Command execution aborted'));
      };

      if (signal?.aborted) {
        reject(new Error('Command execution aborted'));
        return;
      }

      signal?.addEventListener('abort', abortHandler, { once: true });

      const args: string[] = [];

      if (this.currentSessionId) {
        args.push('--resume', this.currentSessionId);
      } else {
        this.currentSessionId = randomUUID();
        args.push('--session-id', this.currentSessionId);
      }

      args.push('--permission-mode', 'bypassPermissions');
      args.push('--model', this.claudeModel);

      // Build the instruction - just pass the user's request directly
      let fullInstruction = instruction;
      
      // If handoff context exists, add it as background context
      if (conversationHistory && conversationHistory.length > 0) {
        const contextBlock = conversationHistory.map(h => h.content).join('\n\n');
        fullInstruction = `[CONTEXT FROM PREVIOUS SESSION]\n${contextBlock}\n[END CONTEXT]\n\n${instruction}`;
        logger.debug('Injected handoff context');
      }

      args.push(fullInstruction);

      logger.debug(`Spawning Claude CLI...`);
      logger.debug(`   Command: claude ${args.join(' ')}`);
      logger.debug(`   Working directory: ${this.projectPath}`);

      const isWindows = process.platform === 'win32';
      let command: string;
      let spawnArgs: string[];

      if (isWindows) {
        command = 'cmd.exe';
        spawnArgs = ['/c', 'claude', ...args];
      } else {
        command = 'claude';
        spawnArgs = args;
      }

      const child = spawn(command, spawnArgs, {
        cwd: this.projectPath,
        env: process.env,
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: false,
        windowsHide: true
      });

      this.currentProcess = child;

      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        logger.debug(text.trimEnd());
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        logger.debug(text.trimEnd());
      });

      child.on('exit', (code, signal) => {
        this.currentProcess = null;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (signal === 'SIGTERM') {
          reject(new Error('Process terminated'));
          return;
        }

        if (code === 0) {
          logger.debug(`Command executed successfully! Time: ${elapsed}s`);
          resolve(this.formatResponse(output));
        } else {
          logger.error(`Process exited with code ${code}`);
          reject(new Error(errorOutput || `Process exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        this.currentProcess = null;
        logger.error('Failed to spawn Claude CLI', error);

        if (error.message.includes('ENOENT')) {
          reject(new Error(
            'Claude CLI not found in PATH.\n\n' +
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
      return 'Not connected. Will connect on first use.';
    }

    return `Claude Code (Official)
    
Project: ${path.basename(this.projectPath)}
Model: ${this.claudeModel}
Backend: Anthropic API
Cost: Paid (API usage)
Privacy: Cloud-based
Session: ${this.currentSessionId || 'None'}`;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('claude --version', { timeout: 5000 }, (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      return true;
    } catch (error) {
      logger.debug(`Claude CLI health check failed: ${error}`);
      return false;
    }
  }

  private formatResponse(output: string): string {
    let formatted = output.trim();
    formatted = formatted.replace(/\x1b\[[0-9;]*m/g, '');
    return formatted || 'Task completed successfully.';
  }
}
