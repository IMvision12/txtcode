import { ChildProcess } from "child_process";

/**
 * Cross-platform process termination.
 * - Windows: uses taskkill /T /F to kill process tree, falls back to proc.kill()
 * - Unix: sends SIGTERM, escalates to SIGKILL after graceMs
 */
export function killProcessTree(proc: ChildProcess, graceMs: number = 100): void {
  if (process.platform === "win32" && proc.pid) {
    try {
      const { execSync } = require("child_process");
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" });
    } catch {
      try {
        proc.kill();
      } catch {}
    }
  } else {
    try {
      proc.kill("SIGTERM");
    } catch {}
    setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {}
    }, graceMs);
  }
}

/**
 * Force-kill a process immediately (no grace period).
 * - Windows: taskkill /T /F
 * - Unix: SIGKILL
 */
export function forceKillProcess(proc: ChildProcess): void {
  if (process.platform === "win32" && proc.pid) {
    try {
      const { execSync } = require("child_process");
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" });
    } catch {
      try {
        proc.kill();
      } catch {}
    }
  } else {
    try {
      proc.kill("SIGKILL");
    } catch {}
  }
}
