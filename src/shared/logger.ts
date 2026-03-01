import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

export const LOG_DIR = path.join(os.homedir(), ".txtcode", "logs");
const RETENTION_DAYS = 7;

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1b\[[0-9;]*m/g;

class Logger {
  private initialized = false;
  private sessionFile: string = "";
  private fd: number | null = null;

  private ensureDir(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    try {
      if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      }
      // On Windows, reset ACLs so files are readable by the current user
      if (process.platform === "win32") {
        try {
          execSync(`icacls "${LOG_DIR}" /reset /t /c /q`, { stdio: "ignore" });
        } catch {
          // ignore — best effort
        }
      }

      this.sessionFile = path.join(LOG_DIR, `session-${this.fileTimestamp()}.log`);
      // Open file with shared read access so other programs (Notepad etc.) can read it
      this.fd = fs.openSync(
        this.sessionFile,
        fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_APPEND,
        0o666,
      );
      this.cleanOldLogs();
    } catch {
      // Logger should never crash the app
    }
  }

  private cleanOldLogs(): void {
    try {
      const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(LOG_DIR);
      for (const file of files) {
        if (!file.startsWith("session-") || !file.endsWith(".log")) {
          continue;
        }
        const fullPath = path.join(LOG_DIR, file);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.mtimeMs < cutoff) {
            fs.unlinkSync(fullPath);
          }
        } catch {
          // Skip files that can't be accessed
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  private fileTimestamp(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${d}-${h}${min}${s}`;
  }

  private timestamp(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    return `${y}-${m}-${d} ${h}:${min}:${s}.${ms}`;
  }

  private strip(msg: string): string {
    return msg.replace(ANSI_REGEX, "");
  }

  private writeToFile(level: string, msg: string): void {
    this.ensureDir();
    if (this.fd === null) {
      return;
    }
    try {
      const line = `[${this.timestamp()}] [${level}] ${msg}\n`;
      fs.writeSync(this.fd, line);
    } catch {
      // If fd became invalid, try to reopen
      try {
        if (!fs.existsSync(LOG_DIR)) {
          fs.mkdirSync(LOG_DIR, { recursive: true });
        }
        this.fd = fs.openSync(
          this.sessionFile,
          fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_APPEND,
          0o666,
        );
        const line = `[${this.timestamp()}] [${level}] ${msg}\n`;
        fs.writeSync(this.fd, line);
      } catch {
        // Logger should never crash the app
      }
    }
  }

  info(msg: string): void {
    console.log(msg);
    this.writeToFile("INFO", this.strip(msg));
  }

  debug(msg: string): void {
    this.writeToFile("DEBUG", this.strip(msg));
  }

  warn(msg: string): void {
    this.writeToFile("WARN", this.strip(msg));
  }

  error(msg: string, err?: unknown): void {
    const errStr =
      err instanceof Error
        ? `: ${err.message}${err.stack ? `\n${err.stack}` : ""}`
        : err
          ? `: ${String(err)}`
          : "";
    this.writeToFile("ERROR", this.strip(msg) + errStr);
  }

  getLogPath(): string {
    this.ensureDir();
    return this.sessionFile;
  }
}

export const logger = new Logger();
