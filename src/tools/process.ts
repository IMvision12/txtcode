import { Tool, ToolDefinition, ToolResult } from './types';
import {
  getSession,
  getFinishedSession,
  deleteSession,
  drainSession,
  listRunningSessions,
  listFinishedSessions,
  clearFinished,
  tail,
} from './process-registry';

export class ProcessTool implements Tool {
  name = 'process';
  description =
    'Manage backgrounded shell commands. Actions: list (show sessions), poll (get latest output), ' +
    'log (get full output), kill (terminate), send (write to stdin), clear (remove finished), ' +
    'remove (delete a specific session).';

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Action to perform.',
            enum: ['list', 'poll', 'log', 'kill', 'send', 'clear', 'remove'],
          },
          session_id: {
            type: 'string',
            description: 'Session ID (required for poll, log, kill, send, remove).',
          },
          data: {
            type: 'string',
            description: 'Data to send to stdin (only for action=send).',
          },
        },
        required: ['action'],
      },
    };
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult> {
    const action = args.action as string;
    const sessionId = args.session_id as string | undefined;

    if (signal?.aborted) {
      return { toolCallId: '', output: 'Process tool execution aborted', isError: true };
    }

    switch (action) {
      case 'list':
        return this.actionList();
      case 'poll':
        return this.actionPoll(sessionId);
      case 'log':
        return this.actionLog(sessionId);
      case 'kill':
        return this.actionKill(sessionId);
      case 'send':
        return this.actionSend(sessionId, args.data as string | undefined);
      case 'clear':
        return this.actionClear();
      case 'remove':
        return this.actionRemove(sessionId);
      default:
        return {
          toolCallId: '',
          output: `Unknown action: ${action}. Use: list, poll, log, kill, send, clear, remove.`,
          isError: true,
        };
    }
  }

  private actionList(): ToolResult {
    const running = listRunningSessions();
    const finished = listFinishedSessions();

    if (running.length === 0 && finished.length === 0) {
      return { toolCallId: '', output: 'No active or finished background sessions.', isError: false };
    }

    const lines: string[] = [];

    if (running.length > 0) {
      lines.push(`Running (${running.length}):`);
      for (const s of running) {
        const elapsed = Math.round((Date.now() - s.startedAt) / 1000);
        lines.push(
          `  [${s.id}] pid=${s.pid ?? '?'} elapsed=${elapsed}s cmd="${truncCmd(s.command)}"`,
        );
      }
    }

    if (finished.length > 0) {
      lines.push(`Finished (${finished.length}):`);
      for (const s of finished) {
        const dur = Math.round((s.endedAt - s.startedAt) / 1000);
        lines.push(
          `  [${s.id}] status=${s.status} exit=${s.exitCode ?? '?'} dur=${dur}s cmd="${truncCmd(s.command)}"`,
        );
      }
    }

    return { toolCallId: '', output: lines.join('\n'), isError: false };
  }

  private actionPoll(sessionId?: string): ToolResult {
    if (!sessionId) {
      return { toolCallId: '', output: 'Error: session_id is required for poll.', isError: true };
    }

    const running = getSession(sessionId);
    if (running) {
      const drained = drainSession(running);
      const output = [drained.stdout, drained.stderr].filter(Boolean).join('\n');
      const elapsed = Math.round((Date.now() - running.startedAt) / 1000);
      const header = `[${running.id}] running, elapsed=${elapsed}s, pid=${running.pid ?? '?'}`;
      return {
        toolCallId: '',
        output: output ? `${header}\n${output}` : `${header}\n(no new output since last poll)`,
        isError: false,
        metadata: { status: 'running', sessionId: running.id },
      };
    }

    const finished = getFinishedSession(sessionId);
    if (finished) {
      const dur = Math.round((finished.endedAt - finished.startedAt) / 1000);
      const header = `[${finished.id}] ${finished.status}, exit=${finished.exitCode ?? '?'}, dur=${dur}s`;
      return {
        toolCallId: '',
        output: `${header}\n${tail(finished.aggregated, 4000) || '(no output)'}`,
        isError: finished.status === 'failed',
        metadata: {
          status: finished.status,
          exitCode: finished.exitCode,
          sessionId: finished.id,
        },
      };
    }

    return { toolCallId: '', output: `Session ${sessionId} not found.`, isError: true };
  }

  private actionLog(sessionId?: string): ToolResult {
    if (!sessionId) {
      return { toolCallId: '', output: 'Error: session_id is required for log.', isError: true };
    }

    const running = getSession(sessionId);
    if (running) {
      const truncNote = running.truncated ? '\n(output was truncated)' : '';
      return {
        toolCallId: '',
        output: running.aggregated || '(no output yet)',
        isError: false,
        metadata: { totalChars: running.totalOutputChars, truncated: running.truncated },
      };
    }

    const finished = getFinishedSession(sessionId);
    if (finished) {
      return {
        toolCallId: '',
        output: finished.aggregated || '(no output)',
        isError: false,
        metadata: { totalChars: finished.totalOutputChars, truncated: finished.truncated },
      };
    }

    return { toolCallId: '', output: `Session ${sessionId} not found.`, isError: true };
  }

  private actionKill(sessionId?: string): ToolResult {
    if (!sessionId) {
      return { toolCallId: '', output: 'Error: session_id is required for kill.', isError: true };
    }

    const running = getSession(sessionId);
    if (!running) {
      return { toolCallId: '', output: `Session ${sessionId} not found or already exited.`, isError: true };
    }

    if (running.child) {
      try {
        running.child.kill('SIGTERM');
        setTimeout(() => {
          if (!running.exited && running.child) {
            try { running.child.kill('SIGKILL'); } catch {}
          }
        }, 3000);
      } catch {}
    }

    return {
      toolCallId: '',
      output: `Sent SIGTERM to session ${sessionId} (pid ${running.pid ?? '?'}). Will force-kill in 3s if still alive.`,
      isError: false,
    };
  }

  private actionSend(sessionId?: string, data?: string): ToolResult {
    if (!sessionId) {
      return { toolCallId: '', output: 'Error: session_id is required for send.', isError: true };
    }
    if (!data) {
      return { toolCallId: '', output: 'Error: data is required for send.', isError: true };
    }

    const running = getSession(sessionId);
    if (!running) {
      return { toolCallId: '', output: `Session ${sessionId} not found or already exited.`, isError: true };
    }
    if (!running.child || !running.child.stdin) {
      return { toolCallId: '', output: `Session ${sessionId} has no stdin available.`, isError: true };
    }

    try {
      running.child.stdin.write(data);
      return { toolCallId: '', output: `Sent ${data.length} bytes to session ${sessionId}.`, isError: false };
    } catch (err) {
      return {
        toolCallId: '',
        output: `Failed to write to stdin: ${err instanceof Error ? err.message : 'Unknown error'}`,
        isError: true,
      };
    }
  }

  private actionClear(): ToolResult {
    const count = listFinishedSessions().length;
    clearFinished();
    return {
      toolCallId: '',
      output: count > 0 ? `Cleared ${count} finished session(s).` : 'No finished sessions to clear.',
      isError: false,
    };
  }

  private actionRemove(sessionId?: string): ToolResult {
    if (!sessionId) {
      return { toolCallId: '', output: 'Error: session_id is required for remove.', isError: true };
    }
    deleteSession(sessionId);
    return { toolCallId: '', output: `Session ${sessionId} removed.`, isError: false };
  }
}

function truncCmd(cmd: string, max = 60): string {
  if (cmd.length <= max) return cmd;
  return cmd.slice(0, max - 3) + '...';
}
