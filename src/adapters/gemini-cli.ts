import { IDEAdapter } from '../shared/types';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../shared/logger';
import path from 'path';
import fs from 'fs';

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

  abort(): void {
    if (this.currentProcess) {
      logger.debug('Aborting current process...');
      
      const isWindows = process.platform === 'win32';
      
      if (isWindows && this.currentProcess.pid) {
        try {
          const { execSync } = require('child_process');
          execSync(`taskkill /pid ${this.currentProcess.pid} /T /F`, { stdio: 'ignore' });
          logger.debug(`Killed process tree ${this.currentProcess.pid} with taskkill`);
        } catch (error) {
          logger.debug(`taskkill failed, trying SIGKILL: ${error}`);
          this.currentProcess.kill('SIGKILL');
        }
      } else {
        this.currentProcess.kill('SIGTERM');
        setTimeout(() => {
          if (this.currentProcess) {
            this.currentProcess.kill('SIGKILL');
          }
        }, 100);
      }
      
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

    logger.debug(`Processing with Gemini Code...`);
    logger.debug(`   Model: ${this.geminiModel || 'default (Gemini CLI)'}`);
    logger.debug(`   Instruction: ${instruction}`);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = '';
      let errorOutput = '';

      // Handle abort signal
      const abortHandler = () => {
        if (this.currentProcess) {
          logger.debug('Aborting command execution...');
          
          const isWindows = process.platform === 'win32';
          const pid = this.currentProcess.pid;
          
          if (isWindows && pid) {
            try {
              const { execSync } = require('child_process');
              execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
              logger.debug(`Killed process tree ${pid} with taskkill`);
            } catch (error) {
              logger.debug(`taskkill failed, trying SIGKILL: ${error}`);
              this.currentProcess.kill('SIGKILL');
            }
          } else {
            this.currentProcess.kill('SIGKILL');
          }
          
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
      args.push('--approval-mode', 'yolo');

      if (this.geminiModel) {
        args.push('--model', this.geminiModel);
      }

      // Build the instruction - just pass the user's request directly
      let fullInstruction = instruction;
      
      // If handoff context exists, add it as background context
      if (conversationHistory && conversationHistory.length > 0) {
        const contextBlock = conversationHistory.map(h => h.content).join('\n\n');
        fullInstruction = `[CONTEXT FROM PREVIOUS SESSION]\n${contextBlock}\n[END CONTEXT]\n\n${instruction}`;
        logger.debug('Injected handoff context into instruction');
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
        
        // Log metadata but filter out code content
        const lines = text.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          // Log file operations, status, and metadata
          if (trimmed.startsWith('file update') || 
              trimmed.startsWith('apply_patch') ||
              trimmed.startsWith('Success.') ||
              trimmed.startsWith('A ') || // Added file
              trimmed.startsWith('M ') || // Modified file
              trimmed.startsWith('D ') || // Deleted file
              trimmed.includes('thinking') ||
              trimmed.includes('gemini') ||
              trimmed.includes('tokens used') ||
              trimmed.includes('succeeded in') ||
              trimmed.includes('exited') ||
              (trimmed.length > 0 && !trimmed.startsWith('+') && !trimmed.startsWith('-') && 
               !trimmed.startsWith('@@') && !trimmed.startsWith('diff --git') &&
               !trimmed.startsWith('index ') && !trimmed.startsWith('---') &&
               !trimmed.startsWith('new file mode') && !line.includes('def ') &&
               !line.includes('class ') && !line.includes('import ') &&
               !line.includes('from ') && !line.includes('return ') &&
               !line.includes('  ') && trimmed.length < 200)) {
            logger.debug(trimmed);
          }
        }
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
