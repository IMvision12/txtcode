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
          onProgress(text);
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

        if (this.exitCodeIndicatesSuccess(code, output)) {
          logger.debug(`Command executed successfully! Time: ${elapsed}s`);
          resolve(this.formatResponse(output || "Task completed successfully."));
        } else {
          logger.error(`Process exited with code ${code}`);
          reject(new Error(errorOutput || `Process exited with code ${code}`));
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
    let formatted = output.trim();
    formatted = formatted.replace(/\x1b\[[0-9;]*m/g, "");
    formatted = this.extraFormatResponse(formatted);
    return formatted || "Task completed successfully.";
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

      if (
        trimmed.startsWith("+") ||
        trimmed.startsWith("-") ||
        trimmed.startsWith("@@") ||
        trimmed.startsWith("diff ") ||
        trimmed.startsWith("index ") ||
        trimmed.startsWith("---") ||
        trimmed.startsWith("+++") ||
        trimmed.startsWith("new file") ||
        trimmed.startsWith("deleted file") ||
        trimmed.includes("def ") ||
        trimmed.includes("class ") ||
        trimmed.includes("import ") ||
        trimmed.includes("from ") ||
        trimmed.includes("return ") ||
        trimmed.includes("    ") ||
        trimmed.length > 150
      ) {
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
