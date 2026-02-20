import { IDEAdapter } from '../shared/types';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../shared/logger';
import path from 'path';

export class KiroAdapter implements IDEAdapter {
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
        exec('kiro-cli --version', (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      logger.debug('Kiro CLI installed');
    } catch (error) {
      throw new Error(
        'Kiro CLI not installed.\n\n' +
        'Install it with:\n' +
        '  curl -fsSL https://cli.kiro.dev/install | bash\n\n' +
        'Visit: https://kiro.dev/cli/'
      );
    }

    logger.debug(`Connected to Kiro CLI`);
    logger.debug(`   Project: ${this.projectPath}`);
    logger.debug(`   Mode: non-interactive`);

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

    logger.debug(`Processing with Kiro CLI...`);
    logger.debug(`   Instruction: ${instruction}`);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = '';
      let errorOutput = '';

      const args: string[] = [
        'chat',
        '--no-interactive',
        instruction,
      ];

      logger.debug(`Spawning Kiro CLI...`);
      logger.debug(`   Command: kiro-cli ${args.join(' ')}`);
      logger.debug(`   Working directory: ${this.projectPath}`);

      const isWindows = process.platform === 'win32';
      let command: string;
      let spawnArgs: string[];

      if (isWindows) {
        command = 'cmd.exe';
        spawnArgs = ['/c', 'kiro-cli', ...args];
      } else {
        command = 'kiro-cli';
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
        logger.error('Failed to spawn Kiro CLI', error);

        if (error.message.includes('ENOENT')) {
          reject(new Error(
            'Kiro CLI not found in PATH.\n\n' +
            'Install it with:\n' +
            '  curl -fsSL https://cli.kiro.dev/install | bash\n\n' +
            'Visit: https://kiro.dev/cli/'
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

    return `Kiro CLI

Project: ${path.basename(this.projectPath)}
Backend: AWS (Claude models)
Cost: Kiro subscription / credits
Privacy: Cloud-based
Session: Stateless (per-invocation)`;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('kiro-cli --version', { timeout: 5000 }, (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      return true;
    } catch (error) {
      logger.debug(`Kiro CLI health check failed: ${error}`);
      return false;
    }
  }

  private formatResponse(output: string): string {
    let formatted = output.trim();
    formatted = formatted.replace(/\x1b\[[0-9;]*m/g, '');
    return formatted || 'Task completed successfully.';
  }
}
