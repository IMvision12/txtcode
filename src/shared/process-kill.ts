import { ChildProcess } from "child_process";

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
