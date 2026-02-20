import { spawn } from 'child_process';
import { Tool, ToolDefinition, ToolResult } from './types';

export class TerminalTool implements Tool {
  name = 'terminal';
  description = 'Execute a shell command on the local machine and return its output.';

  private cwd: string;
  private timeoutMs: number;

  constructor(cwd?: string, timeoutMs?: number) {
    this.cwd = cwd || process.env.PROJECT_PATH || process.cwd();
    this.timeoutMs = timeoutMs || 30000;
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute',
          },
        },
        required: ['command'],
      },
    };
  }

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const command = args.command as string;
    if (!command) {
      return { toolCallId: '', output: 'No command provided', isError: true };
    }

    try {
      const result = await this.runCommand(command);
      const parts: string[] = [];

      if (result.stdout) {
        parts.push(result.stdout);
      }
      if (result.stderr) {
        parts.push(`stderr:\n${result.stderr}`);
      }
      parts.push(`exit code: ${result.exitCode}`);

      return {
        toolCallId: '',
        output: parts.join('\n'),
        isError: result.exitCode !== 0,
      };
    } catch (error) {
      return {
        toolCallId: '',
        output: `Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true,
      };
    }
  }

  private runCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : '/bin/bash';
      const shellArgs = isWindows ? ['/c', command] : ['-c', command];

      const proc = spawn(shell, shellArgs, {
        cwd: this.cwd,
        timeout: this.timeoutMs,
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          stdout: stdout.slice(0, 4000),
          stderr: stderr.slice(0, 2000),
          exitCode: code ?? 1,
        });
      });

      proc.on('error', (err) => {
        resolve({ stdout: '', stderr: err.message, exitCode: 1 });
      });
    });
  }
}
