import { IDEAdapter } from '../shared/types';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../shared/logger';
import path from 'path';

export class GeminiCodeAdapter implements IDEAdapter {
  private connected: boolean = false;
  private projectPath: string;
  private geminiModel: string;
  private currentProcess: ChildProcess | null = null;
  private sessionStarted: boolean = false;

  constructor() {
    this.projectPath = process.env.PROJECT_PATH || process.cwd();
    this.geminiModel = process.env.GEMINI_MODEL || '';
  }

  async connect(): Promise<void> {
    logger.debug('Checking prerequisites...');

    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('gemini --version', (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      logger.debug('Gemini CLI installed');
    } catch (error) {
      throw new Error(
        'Gemini CLI not installed.\n\n' +
        'Please install Gemini CLI first.\n' +
        'Visit: https://github.com/google/generative-ai-cli'
      );
    }

    logger.debug(`Connected to Gemini Code`);
    logger.debug(`   Project: ${this.projectPath}`);
    logger.debug(`   Model: ${this.geminiModel || 'default (Gemini CLI)'}`);
    logger.debug(`   Mode: Google AI API`);

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

    logger.debug(`Processing with Gemini Code...`);
    logger.debug(`   Model: ${this.geminiModel || 'default (Gemini CLI)'}`);
    logger.debug(`   Instruction: ${instruction}`);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = '';
      let errorOutput = '';

      const args: string[] = [];
      args.push('--approval-mode', 'yolo');

      if (this.geminiModel) {
        args.push('--model', this.geminiModel);
      }

      // If handoff context exists, prefix it to the instruction as background context
      let fullInstruction = instruction;
      if (conversationHistory && conversationHistory.length > 0) {
        const contextBlock = conversationHistory.map(h => h.content).join('\n\n');
        fullInstruction = `[CONTEXT FROM PREVIOUS SESSION - do not respond to this, only use as background]\n${contextBlock}\n[END CONTEXT]\n\n${instruction}`;
        logger.debug('Injected handoff context into instruction prefix');
      }

      args.push('-p', fullInstruction);

      logger.debug(`Spawning Gemini CLI...`);
      logger.debug(`   Command: gemini ${args.join(' ')}`);
      logger.debug(`   Working directory: ${this.projectPath}`);

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
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        windowsHide: true
      });

      this.currentProcess = child;

      if (!this.sessionStarted) {
        this.sessionStarted = true;
      }

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
        logger.error('Failed to spawn Gemini CLI', error);

        if (error.message.includes('ENOENT')) {
          reject(new Error(
            'Gemini CLI not found in PATH.\n\n' +
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
      return 'Not connected. Will connect on first use.';
    }

    const modelDisplay = this.geminiModel ? this.geminiModel : 'default (Gemini CLI)';

    return `Gemini Code
    
Project: ${path.basename(this.projectPath)}
Model: ${modelDisplay}
Backend: Google AI API
Cost: Paid (API usage)
Privacy: Cloud-based
Session: ${this.sessionStarted ? 'Active' : 'None'}`;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('gemini --version', { timeout: 5000 }, (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      return true;
    } catch (error) {
      logger.debug(`Gemini CLI health check failed: ${error}`);
      return false;
    }
  }

  private formatResponse(output: string): string {
    let formatted = output.trim();
    formatted = formatted.replace(/\x1b\[[0-9;]*m/g, '');
    formatted = formatted.replace(/YOLO mode is enabled.*?\n/g, '');
    formatted = formatted.replace(/Hook registry initialized.*?\n/g, '');
    formatted = formatted.replace(/Loaded cached credentials.*?\n/g, '');
    return formatted || 'Task completed successfully.';
  }
}
