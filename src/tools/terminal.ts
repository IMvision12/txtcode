import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import {
  createSession,
  appendOutput,
  markExited,
  markBackgrounded,
  drainSession,
  tail,
  ProcessSession,
} from "./process-registry";
import { Tool, ToolDefinition, ToolResult } from "./types";

const DANGEROUS_ENV_VARS = new Set([
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "LD_AUDIT",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "NODE_OPTIONS",
  "NODE_PATH",
  "PYTHONPATH",
  "PYTHONHOME",
  "RUBYLIB",
  "PERL5LIB",
  "BASH_ENV",
  "ENV",
  "GCONV_PATH",
  "IFS",
  "SSLKEYLOGFILE",
]);
const DANGEROUS_ENV_PREFIXES = ["DYLD_", "LD_"];

const DEFAULT_TIMEOUT_SEC = 120;
const DEFAULT_YIELD_MS = 10_000;
const MAX_YIELD_MS = 120_000;
const MAX_OUTPUT_CHARS = 200_000;
const PENDING_MAX_OUTPUT_CHARS = 30_000;

function validateEnv(env: Record<string, string>): void {
  for (const key of Object.keys(env)) {
    const upper = key.toUpperCase();
    if (DANGEROUS_ENV_VARS.has(upper)) {
      throw new Error(`Security: environment variable '${key}' is blocked.`);
    }
    if (DANGEROUS_ENV_PREFIXES.some((p) => upper.startsWith(p))) {
      throw new Error(`Security: environment variable '${key}' is blocked.`);
    }
    if (upper === "PATH") {
      throw new Error(`Security: custom 'PATH' is blocked. Use workdir to change context.`);
    }
  }
}

export interface ExecOutcome {
  status: "completed" | "failed" | "backgrounded";
  exitCode: number | null;
  durationMs: number;
  aggregated: string;
  timedOut: boolean;
  sessionId?: string;
}

export class TerminalTool implements Tool {
  name = "exec";
  description =
    "Execute a shell command. Supports workdir override, env vars, timeout, and background execution via yieldMs. " +
    "Long-running commands auto-background; use the process tool to poll/kill them.";

  private defaultCwd: string;
  private defaultTimeoutSec: number;

  constructor(opts?: { cwd?: string; timeoutSec?: number }) {
    this.defaultCwd = opts?.cwd || process.env.PROJECT_PATH || process.cwd();
    this.defaultTimeoutSec = opts?.timeoutSec ?? DEFAULT_TIMEOUT_SEC;
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Shell command to execute.",
          },
          workdir: {
            type: "string",
            description: "Working directory (defaults to project root).",
          },
          env: {
            type: "object",
            description:
              "Additional environment variables as key-value pairs. PATH and dangerous vars are blocked.",
          },
          timeout: {
            type: "number",
            description: `Timeout in seconds (default ${DEFAULT_TIMEOUT_SEC}). Process is killed on expiry.`,
          },
          yieldMs: {
            type: "number",
            description:
              "Milliseconds to wait before backgrounding a still-running command (default 10000). " +
              "Set to 0 to background immediately. Use the process tool to check on backgrounded commands.",
          },
          background: {
            type: "boolean",
            description: "If true, run in background immediately (equivalent to yieldMs=0).",
          },
        },
        required: ["command"],
      },
    };
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult> {
    const command = args.command as string;
    if (!command) {
      return { toolCallId: "", output: "Error: no command provided.", isError: true };
    }

    if (signal?.aborted) {
      return { toolCallId: "", output: "Command execution aborted", isError: true };
    }

    const workdir = (args.workdir as string)?.trim() || this.defaultCwd;
    const userEnv = args.env as Record<string, string> | undefined;
    const timeoutSec =
      typeof args.timeout === "number" && args.timeout > 0 ? args.timeout : this.defaultTimeoutSec;
    const backgroundImmediate = args.background === true;
    const yieldMs = backgroundImmediate
      ? 0
      : typeof args.yieldMs === "number"
        ? Math.max(0, Math.min(args.yieldMs, MAX_YIELD_MS))
        : DEFAULT_YIELD_MS;

    if (userEnv) {
      try {
        validateEnv(userEnv);
      } catch (err) {
        return {
          toolCallId: "",
          output: err instanceof Error ? err.message : "Invalid env.",
          isError: true,
        };
      }
    }

    const env = userEnv ? { ...process.env, ...userEnv } : { ...process.env };

    const session = createSession({
      command,
      cwd: workdir,
      maxOutputChars: MAX_OUTPUT_CHARS,
      pendingMaxOutputChars: PENDING_MAX_OUTPUT_CHARS,
    });

    try {
      const outcome = await this.runProcess(
        session,
        command,
        workdir,
        env,
        timeoutSec,
        yieldMs,
        signal,
      );
      return this.formatResult(outcome, session);
    } catch (error) {
      return {
        toolCallId: "",
        output: `Exec failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        isError: true,
      };
    }
  }

  private runProcess(
    session: ProcessSession,
    command: string,
    workdir: string,
    env: Record<string, string | undefined>,
    timeoutSec: number,
    yieldMs: number,
    signal?: AbortSignal,
  ): Promise<ExecOutcome> {
    return new Promise((resolve) => {
      const isWindows = process.platform === "win32";
      const shell = isWindows ? "cmd.exe" : "/bin/bash";
      const shellArgs = isWindows ? ["/c", command] : ["-c", command];
      const startedAt = Date.now();

      let proc: ChildProcessWithoutNullStreams;
      try {
        proc = spawn(shell, shellArgs, { cwd: workdir, env: env as NodeJS.ProcessEnv });
      } catch (err) {
        markExited(session, null, null, "failed");
        resolve({
          status: "failed",
          exitCode: null,
          durationMs: Date.now() - startedAt,
          aggregated: `Spawn error: ${err instanceof Error ? err.message : String(err)}`,
          timedOut: false,
        });
        return;
      }

      session.child = proc;
      session.pid = proc.pid;
      let yielded = false;
      let processExited = false;

      // Handle abort signal
      const abortHandler = () => {
        if (!processExited) {
          try {
            proc.kill("SIGTERM");
          } catch {}
          if (!yielded) {
            markExited(session, null, "SIGTERM", "killed");
            resolve({
              status: "failed",
              exitCode: null,
              durationMs: Date.now() - startedAt,
              aggregated: session.aggregated.trim() + "\n\n(Command aborted)",
              timedOut: false,
            });
          } else {
            markExited(session, null, "SIGTERM", "killed");
          }
        }
      };

      signal?.addEventListener("abort", abortHandler, { once: true });

      proc.stdout.on("data", (data: Buffer) => {
        appendOutput(session, "stdout", data.toString());
      });

      proc.stderr.on("data", (data: Buffer) => {
        appendOutput(session, "stderr", data.toString());
      });

      const timeoutMs = timeoutSec * 1000;
      const killTimer = setTimeout(() => {
        if (!processExited) {
          try {
            proc.kill("SIGKILL");
          } catch {}
          if (!yielded) {
            markExited(session, null, "SIGKILL", "killed");
            resolve({
              status: "failed",
              exitCode: null,
              durationMs: Date.now() - startedAt,
              aggregated:
                session.aggregated.trim() + `\n\n(Command timed out after ${timeoutSec}s)`,
              timedOut: true,
            });
          } else {
            markExited(session, null, "SIGKILL", "killed");
          }
        }
      }, timeoutMs);

      let yieldTimer: ReturnType<typeof setTimeout> | null = null;
      if (yieldMs >= 0) {
        if (yieldMs === 0) {
          yielded = true;
          markBackgrounded(session);
          resolve({
            status: "backgrounded",
            exitCode: null,
            durationMs: 0,
            aggregated: "",
            timedOut: false,
            sessionId: session.id,
          });
        } else {
          yieldTimer = setTimeout(() => {
            if (!processExited && !yielded) {
              yielded = true;
              markBackgrounded(session);
              resolve({
                status: "backgrounded",
                exitCode: null,
                durationMs: Date.now() - startedAt,
                aggregated: session.tail,
                timedOut: false,
                sessionId: session.id,
              });
            }
          }, yieldMs);
        }
      }

      proc.on("close", (code, signal) => {
        processExited = true;
        clearTimeout(killTimer);
        if (yieldTimer) {
          clearTimeout(yieldTimer);
        }

        const status: "completed" | "failed" = code === 0 ? "completed" : "failed";
        markExited(session, code, signal?.toString() ?? null, status);

        if (!yielded) {
          const aggregated = session.aggregated.trim();
          const exitMsg = code !== null && code !== 0 ? `\n\n(exit code ${code})` : "";
          resolve({
            status,
            exitCode: code,
            durationMs: Date.now() - startedAt,
            aggregated: aggregated + exitMsg,
            timedOut: false,
          });
        }
      });

      proc.on("error", (err) => {
        processExited = true;
        clearTimeout(killTimer);
        if (yieldTimer) {
          clearTimeout(yieldTimer);
        }

        markExited(session, null, null, "failed");

        if (!yielded) {
          resolve({
            status: "failed",
            exitCode: null,
            durationMs: Date.now() - startedAt,
            aggregated: `Process error: ${err.message}`,
            timedOut: false,
          });
        }
      });
    });
  }

  private formatResult(outcome: ExecOutcome, session: ProcessSession): ToolResult {
    if (outcome.status === "backgrounded") {
      return {
        toolCallId: "",
        output:
          `Command backgrounded (session ${session.id}, pid ${session.pid ?? "n/a"}). ` +
          `Use the process tool with action "poll" and session_id "${session.id}" to check status.` +
          (outcome.aggregated ? `\n\nInitial output:\n${outcome.aggregated}` : ""),
        isError: false,
        metadata: {
          sessionId: session.id,
          pid: session.pid,
          status: "running",
        },
      };
    }

    const output = outcome.aggregated || "(no output)";
    return {
      toolCallId: "",
      output,
      isError: outcome.status === "failed",
      metadata: {
        exitCode: outcome.exitCode,
        durationMs: outcome.durationMs,
        timedOut: outcome.timedOut,
        truncated: session.truncated,
      },
    };
  }
}
