import { IDEAdapter } from '../shared/types';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../shared/logger';
import path from 'path';
import fs from 'fs';

export class CodexAdapter implements IDEAdapter {
  private connected: boolean = false;
  private projectPath: string;
  private currentProcess: ChildProcess | null = null;

  constructor() {
    this.projectPath = process.env.PROJECT_PATH || process.cwd();
  }

  async connect(): Promise<void> {
    logger.debug('Checking prerequisites...');

    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('codex --version', (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      logger.debug('OpenAI Codex CLI installed');
    } catch (error) {
      throw new Error(
        'OpenAI Codex CLI not installed.\n\n' +
        'Install it with:\n' +
        '  npm install -g @openai/codex\n\n' +
        'Visit: https://github.com/openai/codex'
      );
    }

    logger.debug(`Connected to OpenAI Codex`);
    logger.debug(`   Project: ${this.projectPath}`);
    logger.debug(`   Model: configured in ~/.codex/config.toml`);
    logger.debug(`   Mode: OpenAI API`);

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

    logger.debug(`Processing with OpenAI Codex...`);
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

      // Build the instruction - just pass the user's request directly
      // The codex CLI has its own system prompt handling
      let fullInstruction = instruction;
      
      // If handoff context exists, add it as background context
      if (conversationHistory && conversationHistory.length > 0) {
        const contextBlock = conversationHistory.map(h => h.content).join('\n\n');
        fullInstruction = `[CONTEXT FROM PREVIOUS SESSION]\n${contextBlock}\n[END CONTEXT]\n\n${instruction}`;
        logger.debug('Injected handoff context into instruction');
      }

      const args: string[] = [
        'exec',
        '--full-auto',
        '--cd', this.projectPath,
        fullInstruction,
      ];

      logger.debug(`Spawning Codex CLI...`);
      logger.debug(`   Command: codex ${args.join(' ')}`);
      logger.debug(`   Working directory: ${this.projectPath}`);

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

        if (code === 0 || output.length > 0) {
          logger.debug(`Command executed successfully! Time: ${elapsed}s`);
          resolve(this.formatResponse(output || 'Task completed successfully.'));
        } else {
          logger.error(`Process exited with code ${code}`);
          reject(new Error(errorOutput || `Process exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        this.currentProcess = null;
        logger.error('Failed to spawn Codex CLI', error);

        if (error.message.includes('ENOENT')) {
          reject(new Error(
            'Codex CLI not found in PATH.\n\n' +
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
      return 'Not connected. Will connect on first use.';
    }

    return `OpenAI Codex

Project: ${path.basename(this.projectPath)}
Model: configured in ~/.codex/config.toml
Backend: OpenAI API
Cost: Paid (API usage)
Privacy: Cloud-based (sandboxed execution)
Session: Stateless (per-invocation)`;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('codex --version', { timeout: 5000 }, (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      return true;
    } catch (error) {
      logger.debug(`Codex CLI health check failed: ${error}`);
      return false;
    }
  }

  private formatResponse(output: string): string {
    let formatted = output.trim();
    formatted = formatted.replace(/\x1b\[[0-9;]*m/g, '');
    return formatted || 'Task completed successfully.';
  }
}
