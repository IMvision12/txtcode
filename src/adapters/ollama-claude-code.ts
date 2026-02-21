import { IDEAdapter } from '../shared/types';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import { logger } from '../shared/logger';
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
    logger.debug('Checking prerequisites...');

    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('ollama --version', (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      logger.debug('Ollama installed');
    } catch (error) {
      throw new Error(
        'Ollama not installed.\n\n' +
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
        logger.debug(`Model ${this.ollamaModel} not found`);
        logger.debug(`   Available models: ${models.map((m: any) => m.name).join(', ')}`);
        throw new Error(`Model ${this.ollamaModel} not available`);
      }

      logger.debug('Ollama running');
      logger.debug(`Model ${this.ollamaModel} available`);
    } catch (error) {
      throw new Error(
        `Ollama setup failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
        'Make sure:\n' +
        '1. Ollama is running: ollama serve\n' +
        '2. Model is available: ollama list'
      );
    }

    logger.debug(`Connected to Claude Code (via Ollama)`);
    logger.debug(`   Project: ${this.projectPath}`);
    logger.debug(`   Model: ${this.ollamaModel}`);
    logger.debug(`   Mode: Ollama Launch`);

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

    logger.debug(`Processing with Claude Code (via Ollama)...`);
    logger.debug(`   Model: ${this.ollamaModel}`);
    logger.debug(`   Instruction: ${instruction}`);

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
      let fullSystemPrompt = systemPrompt;

      // Inject handoff context into system prompt (not as instruction)
      if (conversationHistory && conversationHistory.length > 0) {
        const contextBlock = conversationHistory.map(h => h.content).join('\n\n');
        fullSystemPrompt += `\n\n${contextBlock}`;
        logger.debug('Injected handoff context into system prompt');
      }

      claudeArgs.push('--append-system-prompt', fullSystemPrompt);
      claudeArgs.push(instruction);

      if (claudeArgs.length > 0) {
        args.push('--', ...claudeArgs);
      }

      logger.debug(`Spawning Ollama Claude Code...`);
      logger.debug(`   Command: ollama ${args.join(' ')}`);
      logger.debug(`   Working directory: ${this.projectPath}`);

      const isWindows = process.platform === 'win32';
      let command: string;
      let spawnArgs: string[];

      if (isWindows) {
        command = 'cmd.exe';
        spawnArgs = ['/c', 'ollama', ...args];
      } else {
        command = 'ollama';
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
        logger.error('Failed to spawn Ollama', error);

        if (error.message.includes('ENOENT')) {
          reject(new Error(
            'Ollama not found in PATH.\n\n' +
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
      return 'Not connected. Will connect on first use.';
    }

    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data: any = await response.json();
      const models = data.models || [];

      return `Claude Code (via Ollama Launch)
      
Project: ${path.basename(this.projectPath)}
Model: ${this.ollamaModel}
Backend: Ollama (Local)
Cost: Free
Privacy: 100% Local
Session: ${this.currentSessionId || 'None'}
Available models: ${models.length}`;
    } catch {
      return 'Ollama service not running. Start with: ollama serve';
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Check if Ollama CLI is installed
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('ollama --version', { timeout: 5000 }, (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });

      // Check if Ollama service is running
      const response = await fetch('http://localhost:11434/api/tags', {
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) {
        return false;
      }

      // Check if the configured model is available
      const data: any = await response.json();
      const models = data.models || [];
      const modelExists = models.some((m: any) => m.name === this.ollamaModel);

      return modelExists;
    } catch (error) {
      logger.debug(`Ollama health check failed: ${error}`);
      return false;
    }
  }

  private loadSystemPrompt(): string {
    const promptPath = path.join(__dirname, '..', 'data', 'code_adaptors_system_prompt.txt');
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
    return formatted || 'Task completed successfully.';
  }
}
