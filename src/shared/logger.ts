import fs from "fs";
import os from "os";
import path from "path";

export const LOG_DIR = path.join(os.homedir(), ".txtcode", "logs");
const RETENTION_DAYS = 7;

class Logger {
  private stream: fs.WriteStream | null = null;
  private initialized = false;
  private sessionFile: string = "";

  private ensureDir(): void {
    if (this.initialized) {
      return;
    }
    try {
      if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      }
      this.sessionFile = path.join(LOG_DIR, `session-${this.fileTimestamp()}.log`);
      this.cleanOldLogs();
      this.stream = fs.createWriteStream(this.sessionFile, { flags: "a" });
      this.stream.on("error", () => {});
      this.initialized = true;
    } catch {
      this.initialized = true;
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
        const stat = fs.statSync(fullPath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(fullPath);
        }
      }
    } catch {}
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
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  }

  private writeToFile(level: string, msg: string): void {
    this.ensureDir();
    if (this.stream) {
      const line = `[${this.timestamp()}] [${level}] ${msg}\n`;
      this.stream.write(line);
    }
  }

  info(msg: string): void {
    console.log(msg);
    // eslint-disable-next-line no-control-regex
    this.writeToFile("INFO", msg.replace(/\x1b\[[0-9;]*m/g, ""));
  }

  debug(msg: string): void {
    // eslint-disable-next-line no-control-regex
    this.writeToFile("DEBUG", msg.replace(/\x1b\[[0-9;]*m/g, ""));
  }

  error(msg: string, err?: unknown): void {
    const errStr = err instanceof Error ? `: ${err.message}` : err ? `: ${String(err)}` : "";
    // eslint-disable-next-line no-control-regex
    this.writeToFile("ERROR", msg.replace(/\x1b\[[0-9;]*m/g, "") + errStr);
  }

  getLogPath(): string {
    this.ensureDir();
    return this.sessionFile;
  }
}

export const logger = new Logger();
