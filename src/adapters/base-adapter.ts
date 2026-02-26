import { spawn, ChildProcess } from "child_process";
import path from "path";
import { logger } from "../shared/logger";
import { IDEAdapter } from "../shared/types";

export interface AdapterConfig {
  cliCommand: string;
  displayName: string;
  installUrl: string;
  installInstructions: string;
  statusKeywords: string[];
  stdinMode: "inherit" | "pipe";
}

const RATE_LIMIT_PATTERNS = [
  /rate.?limit/i,
  /too many requests/i,
  /429/,
  /quota.?exceeded/i,
  /token.?limit/i,
  /context.?length.?exceeded/i,
  /max.?tokens/i,
  /capacity/i,
  /overloaded/i,
  /throttl/i,
];

const CLI_NOISE_PATTERNS = [
  /^╭─+╮$/,
  /^╰─+╯$/,
  /^│\s*│$/,
  /^\s*⎿\s*$/,
  /^\s*⎡\s*$/,
  /^─+$/,
  /^━+$/,
  /^Loading/i,
  /^Initializing/i,
  /^Connecting/i,
  /^Starting/i,
  /^\s*\d+\s*[│|]\s*$/,
  /^>\s*$/,
  /YOLO mode is enabled/i,
  /Hook registry initialized/i,
  /Loaded cached credentials/i,
  /^\s*tokens used/i,
  /^\s*input tokens/i,
  /^\s*output tokens/i,
  /^\s*total cost/i,
  /^\s*session cost/i,
  /^\s*duration/i,
  /^\s*\d+\.\d+s\s*$/,
];

export abstract class BaseAdapter implements IDEAdapter {
  protected connected: boolean = false;
  protected projectPath: string;
  protected currentProcess: ChildProcess | null = null;

  constructor() {
    this.projectPath = process.env.PROJECT_PATH || process.cwd();
  }

  protected abstract getConfig(): AdapterConfig;

  protected abstract buildArgs(fullInstruction: string): string[];

  protected abstract getStatusText(): string;

  protected async extraConnectChecks(): Promise<void> {}

  protected extraFormatResponse(formatted: string): string {
    return formatted;
  }

  protected exitCodeIndicatesSuccess(code: number | null, output: string): boolean {
    return code === 0;
  }

  async connect(): Promise<void> {
    const config = this.getConfig();
    logger.debug("Checking prerequisites...");

    try {
      const { exec } = require("child_process");
      await new Promise((resolve, reject) => {
        exec(`${config.cliCommand} --version`, (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      logger.debug(`${config.displayName} installed`);
    } catch (error) {
      throw new Error(
        `${config.displayName} not installed.\n\n${config.installInstructions}\nVisit: ${config.installUrl}`,
        { cause: error },
      );
    }

    await this.extraConnectChecks();

    logger.debug(`Connected to ${config.displayName}`);
    logger.debug(`   Project: ${this.projectPath}`);

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.currentProcess) {
      this.currentProcess.kill("SIGTERM");
      this.currentProcess = null;
    }
    this.connected = false;
  }

  abort(): void {
    if (this.currentProcess) {
      logger.debug("Aborting current process...");
      this.killProcess(this.currentProcess);
      this.currentProcess = null;
    }
  }

  async executeCommand(
    instruction: string,
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
    signal?: AbortSignal,
    onProgress?: (chunk: string) => void,
  ): Promise<string> {
    if (!this.connected) {
      await this.connect();
    }

    const config = this.getConfig();
    logger.debug(`Processing with ${config.displayName}...`);
    logger.debug(`   Instruction: ${instruction}`);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = "";
      let errorOutput = "";

      const abortHandler = () => {
        if (this.currentProcess) {
          logger.debug("Aborting command execution...");
          this.killProcess(this.currentProcess);
          this.currentProcess = null;
        }
        reject(new Error("Command execution aborted"));
      };

      if (signal?.aborted) {
        reject(new Error("Command execution aborted"));
        return;
      }

      signal?.addEventListener("abort", abortHandler, { once: true });

      let fullInstruction = instruction;
      if (conversationHistory && conversationHistory.length > 0) {
        const contextBlock = conversationHistory.map((h) => h.content).join("\n\n");
        fullInstruction = `[CONTEXT FROM PREVIOUS SESSION]\n${contextBlock}\n[END CONTEXT]\n\n${instruction}`;
        logger.debug("Injected handoff context");
      }

      const args = this.buildArgs(fullInstruction);

      logger.debug(`Spawning ${config.displayName}...`);
      logger.debug(`   Command: ${config.cliCommand} ${args.join(" ")}`);
      logger.debug(`   Working directory: ${this.projectPath}`);

      const isWindows = process.platform === "win32";
      let command: string;
      let spawnArgs: string[];

      if (isWindows) {
        command = "cmd.exe";
        spawnArgs = ["/c", config.cliCommand, ...args];
      } else {
        command = config.cliCommand;
        spawnArgs = args;
      }

      const child = spawn(command, spawnArgs, {
        cwd: this.projectPath,
        env: process.env,
        stdio: [config.stdinMode, "pipe", "pipe"],
        shell: false,
        windowsHide: true,
      });

      this.currentProcess = child;
      this.onProcessSpawned();

      child.stdout!.on("data", (data) => {
        const text = data.toString();
        output += text;

        if (onProgress) {
          const cleaned = this.cleanProgressChunk(text);
          if (cleaned) {
            onProgress(cleaned);
          }
        }

        this.filterAndLogOutput(text, config.statusKeywords);
      });

      child.stderr!.on("data", (data) => {
        const text = data.toString();
        errorOutput += text;
        logger.debug(text.trimEnd());
      });

      child.on("exit", (code, sig) => {
        this.currentProcess = null;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (sig === "SIGTERM") {
          reject(new Error("Process terminated"));
          return;
        }

        const combined = output + "\n" + errorOutput;
        const rateLimitMsg = detectRateLimit(combined);
        if (rateLimitMsg) {
          resolve(rateLimitMsg);
          return;
        }

        if (this.exitCodeIndicatesSuccess(code, output)) {
          logger.debug(`Command executed successfully! Time: ${elapsed}s`);
          resolve(this.formatResponse(output || "Task completed successfully."));
        } else {
          const errRateLimit = detectRateLimit(errorOutput);
          if (errRateLimit) {
            resolve(errRateLimit);
            return;
          }
          logger.error(`Process exited with code ${code}`);
          resolve(this.formatErrorResponse(errorOutput, code));
        }
      });

      child.on("error", (error) => {
        this.currentProcess = null;
        logger.error(`Failed to spawn ${config.displayName}`, error);

        if (error.message.includes("ENOENT")) {
          reject(
            new Error(
              `${config.displayName} not found in PATH.\n\n${config.installInstructions}\nVisit: ${config.installUrl}`,
            ),
          );
        } else {
          reject(error);
        }
      });
    });
  }

  async getStatus(): Promise<string> {
    if (!this.connected) {
      return "Not connected. Will connect on first use.";
    }
    return this.getStatusText();
  }

  async isHealthy(): Promise<boolean> {
    const config = this.getConfig();
    try {
      const { exec } = require("child_process");
      await new Promise((resolve, reject) => {
        exec(`${config.cliCommand} --version`, { timeout: 5000 }, (error: any, stdout: string) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      return true;
    } catch (error) {
      logger.debug(`${config.displayName} health check failed: ${error}`);
      return false;
    }
  }

  protected onProcessSpawned(): void {}

  private formatResponse(output: string): string {
    let formatted = stripAnsi(output);
    formatted = this.stripCliNoise(formatted);
    formatted = this.extraFormatResponse(formatted);
    formatted = collapseWhitespace(formatted);
    return formatted || "Task completed successfully.";
  }

  private formatErrorResponse(errorOutput: string, code: number | null): string {
    const cleaned = stripAnsi(errorOutput).trim();
    if (!cleaned) {
      return `Command failed (exit code ${code}). The adapter may have encountered an internal error.`;
    }
    const truncated = cleaned.length > 500 ? cleaned.slice(-500) : cleaned;
    return `Command failed (exit code ${code}):\n${truncated}`;
  }

  private cleanProgressChunk(raw: string): string | null {
    let text = stripAnsi(raw);

    const lines = text.split("\n");
    const kept: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (isCliNoiseLine(trimmed)) continue;
      if (isDiffLine(trimmed)) continue;
      kept.push(line);
    }

    const result = kept.join("\n").trim();
    return result || null;
  }

  private stripCliNoise(text: string): string {
    const lines = text.split("\n");
    const kept: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (isCliNoiseLine(trimmed)) continue;
      kept.push(line);
    }

    return kept.join("\n");
  }

  private killProcess(proc: ChildProcess): void {
    const isWindows = process.platform === "win32";

    if (isWindows && proc.pid) {
      try {
        const { execSync } = require("child_process");
        execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" });
        logger.debug(`Killed process tree ${proc.pid} with taskkill`);
      } catch (error) {
        logger.debug(`taskkill failed, trying SIGKILL: ${error}`);
        proc.kill("SIGKILL");
      }
    } else {
      proc.kill("SIGTERM");
      setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {
          // process already exited
        }
      }, 100);
    }
  }

  private filterAndLogOutput(text: string, statusKeywords: string[]): void {
    const lines = text.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();

      if (isDiffLine(trimmed) || trimmed.length > 150) {
        continue;
      }

      const isStatus =
        trimmed.includes("thinking") ||
        trimmed.includes("tokens used") ||
        trimmed.includes("succeeded in") ||
        trimmed.includes("Command executed") ||
        trimmed.startsWith("exec") ||
        trimmed.startsWith("file update") ||
        trimmed.startsWith("apply_patch") ||
        trimmed.startsWith("Success") ||
        statusKeywords.some((kw) => trimmed.includes(kw));

      if (isStatus) {
        logger.debug(trimmed);
      }
    }
  }
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, "").replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
}

function collapseWhitespace(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function isDiffLine(trimmed: string): boolean {
  return (
    trimmed.startsWith("+") ||
    trimmed.startsWith("-") ||
    trimmed.startsWith("@@") ||
    trimmed.startsWith("diff ") ||
    trimmed.startsWith("index ") ||
    trimmed.startsWith("---") ||
    trimmed.startsWith("+++") ||
    trimmed.startsWith("new file") ||
    trimmed.startsWith("deleted file")
  );
}

function isCliNoiseLine(trimmed: string): boolean {
  if (!trimmed) return true;
  return CLI_NOISE_PATTERNS.some((p) => p.test(trimmed));
}

function detectRateLimit(text: string): string | null {
  for (const pattern of RATE_LIMIT_PATTERNS) {
    if (pattern.test(text)) {
      return "The AI model has reached its usage limit. Please wait a moment and try again, or use /switch to change to a different provider.";
    }
  }
  return null;
}
