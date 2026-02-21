import { ChildProcessWithoutNullStreams } from "child_process";
import crypto from "crypto";

const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_OUTPUT_CHARS = 200_000;
const DEFAULT_PENDING_MAX_OUTPUT_CHARS = 30_000;
const TAIL_CHARS = 2000;

export type ProcessStatus = "running" | "completed" | "failed" | "killed";

export interface ProcessSession {
  id: string;
  command: string;
  child?: ChildProcessWithoutNullStreams;
  pid?: number;
  startedAt: number;
  cwd?: string;
  maxOutputChars: number;
  pendingMaxOutputChars: number;
  totalOutputChars: number;
  pendingStdout: string[];
  pendingStderr: string[];
  pendingStdoutChars: number;
  pendingStderrChars: number;
  aggregated: string;
  tail: string;
  exitCode?: number | null;
  exitSignal?: string | null;
  exited: boolean;
  truncated: boolean;
  backgrounded: boolean;
}

export interface FinishedSession {
  id: string;
  command: string;
  startedAt: number;
  endedAt: number;
  cwd?: string;
  status: ProcessStatus;
  exitCode?: number | null;
  exitSignal?: string | null;
  aggregated: string;
  tail: string;
  truncated: boolean;
  totalOutputChars: number;
}

const runningSessions = new Map<string, ProcessSession>();
const finishedSessions = new Map<string, FinishedSession>();
let sweeper: ReturnType<typeof setInterval> | null = null;

export function createSessionId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function createSession(opts: {
  command: string;
  cwd?: string;
  maxOutputChars?: number;
  pendingMaxOutputChars?: number;
}): ProcessSession {
  const id = createSessionId();
  const session: ProcessSession = {
    id,
    command: opts.command,
    startedAt: Date.now(),
    cwd: opts.cwd,
    maxOutputChars: opts.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS,
    pendingMaxOutputChars: opts.pendingMaxOutputChars ?? DEFAULT_PENDING_MAX_OUTPUT_CHARS,
    totalOutputChars: 0,
    pendingStdout: [],
    pendingStderr: [],
    pendingStdoutChars: 0,
    pendingStderrChars: 0,
    aggregated: "",
    tail: "",
    exited: false,
    truncated: false,
    backgrounded: false,
  };
  runningSessions.set(id, session);
  startSweeper();
  return session;
}

export function getSession(id: string): ProcessSession | undefined {
  return runningSessions.get(id);
}

export function getFinishedSession(id: string): FinishedSession | undefined {
  return finishedSessions.get(id);
}

export function deleteSession(id: string): void {
  runningSessions.delete(id);
  finishedSessions.delete(id);
}

export function appendOutput(
  session: ProcessSession,
  stream: "stdout" | "stderr",
  chunk: string,
): void {
  const buffer = stream === "stdout" ? session.pendingStdout : session.pendingStderr;
  const bufferCharsKey = stream === "stdout" ? "pendingStdoutChars" : "pendingStderrChars";
  const pendingCap = Math.min(session.pendingMaxOutputChars, session.maxOutputChars);

  buffer.push(chunk);
  let pendingChars = session[bufferCharsKey] + chunk.length;

  if (pendingChars > pendingCap) {
    session.truncated = true;
    pendingChars = capBuffer(buffer, pendingChars, pendingCap);
  }
  session[bufferCharsKey] = pendingChars;
  session.totalOutputChars += chunk.length;

  const newAggregated = session.aggregated + chunk;
  if (newAggregated.length > session.maxOutputChars) {
    session.truncated = true;
    session.aggregated = newAggregated.slice(newAggregated.length - session.maxOutputChars);
  } else {
    session.aggregated = newAggregated;
  }
  session.tail = tail(session.aggregated, TAIL_CHARS);
}

export function drainSession(session: ProcessSession): { stdout: string; stderr: string } {
  const stdout = session.pendingStdout.join("");
  const stderr = session.pendingStderr.join("");
  session.pendingStdout = [];
  session.pendingStderr = [];
  session.pendingStdoutChars = 0;
  session.pendingStderrChars = 0;
  return { stdout, stderr };
}

export function markExited(
  session: ProcessSession,
  exitCode: number | null,
  exitSignal: string | null,
  status: ProcessStatus,
): void {
  session.exited = true;
  session.exitCode = exitCode;
  session.exitSignal = exitSignal;
  session.tail = tail(session.aggregated, TAIL_CHARS);

  cleanupChild(session);
  runningSessions.delete(session.id);

  if (session.backgrounded) {
    finishedSessions.set(session.id, {
      id: session.id,
      command: session.command,
      startedAt: session.startedAt,
      endedAt: Date.now(),
      cwd: session.cwd,
      status,
      exitCode: session.exitCode,
      exitSignal: session.exitSignal,
      aggregated: session.aggregated,
      tail: session.tail,
      truncated: session.truncated,
      totalOutputChars: session.totalOutputChars,
    });
  }
}

export function markBackgrounded(session: ProcessSession): void {
  session.backgrounded = true;
}

export function listRunningSessions(): ProcessSession[] {
  return Array.from(runningSessions.values()).filter((s) => s.backgrounded);
}

export function listFinishedSessions(): FinishedSession[] {
  return Array.from(finishedSessions.values());
}

export function clearFinished(): void {
  finishedSessions.clear();
}

export function tail(text: string, max = TAIL_CHARS): string {
  if (text.length <= max) {
    return text;
  }
  return text.slice(text.length - max);
}

function capBuffer(buffer: string[], pendingChars: number, cap: number): number {
  while (buffer.length > 0 && pendingChars - buffer[0].length >= cap) {
    pendingChars -= buffer[0].length;
    buffer.shift();
  }
  if (buffer.length > 0 && pendingChars > cap) {
    const overflow = pendingChars - cap;
    buffer[0] = buffer[0].slice(overflow);
    pendingChars = cap;
  }
  return pendingChars;
}

function cleanupChild(session: ProcessSession): void {
  if (session.child) {
    session.child.stdin?.destroy?.();
    session.child.stdout?.destroy?.();
    session.child.stderr?.destroy?.();
    session.child.removeAllListeners();
    delete session.child;
  }
}

function pruneFinishedSessions(): void {
  const cutoff = Date.now() - DEFAULT_SESSION_TTL_MS;
  for (const [id, session] of finishedSessions.entries()) {
    if (session.endedAt < cutoff) {
      finishedSessions.delete(id);
    }
  }
}

function startSweeper(): void {
  if (sweeper) {
    return;
  }
  sweeper = setInterval(pruneFinishedSessions, 60_000);
  if (sweeper.unref) {
    sweeper.unref();
  }
}
