import { spawn, ChildProcess } from "child_process";
import { randomUUID } from "crypto";
import path from "path";
import { logger } from "../shared/logger";
import { IDEAdapter } from "../shared/types";

export class CursorAdapter implements IDEAdapter {
  private connected: boolean = false;
  private projectPath: string;
  private currentProcess: ChildProcess | null = null;
  private currentSessionId: string | null = null;

  constructor() {
    this.projectPath = process.env.PROJECT_PATH || process.cwd();
  }

  async connect(): Promise<void> {
    logger.debug("Checking prerequisites...");

    try {
      const { exec } = require("child_process");
      await new Promise((resolve, reject) => {
        exec("cursor --version", (error: any, stdout: string) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });
      logger.debug("Cursor CLI installed");
    } catch (error) {
      throw new Error(
        "Cursor CLI not installed.\n\n" +
          "Please install Cursor IDE first.\n" +
          "Visit: https://cursor.sh\n\n" +
          "After installation, ensure 'cursor' command is in PATH.",
        { cause: error },
      );
    }

    logger.debug(`Connected to Cursor CLI`);
    logger.debug(`   Project: ${this.projectPath}`);
    logger.debug(`   Mode: Headless`);

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

      const isWindows = process.platform === "win32";

      if (isWindows && this.currentProcess.pid) {
        try {
          const { execSync } = require("child_process");
          execSync(`taskkill /pid ${this.currentProcess.pid} /T /F`, { stdio: "ignore" });
          logger.debug(`Killed process tree ${this.currentProcess.pid} with taskkill`);
        } catch (error) {
          logger.debug(`taskkill failed, trying SIGKILL: ${error}`);
          this.currentProcess.kill("SIGKILL");
        }
      } else {
        this.currentProcess.kill("SIGTERM");
        setTimeout(() => {
          if (this.currentProcess) {
            this.currentProcess.kill("SIGKILL");
          }
        }, 100);
      }

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

    logger.debug(`Processing with Cursor CLI...`);
    logger.debug(`   Instruction: ${instruction}`);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = "";
      let errorOutput = "";

      // Handle abort signal
      const abortHandler = () => {
        if (this.currentProcess) {
          logger.debug("Aborting command execution...");

          const isWindows = process.platform === "win32";
          const pid = this.currentProcess.pid;

          if (isWindows && pid) {
            try {
              const { execSync } = require("child_process");
              execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
              logger.debug(`Killed process tree ${pid} with taskkill`);
            } catch (error) {
              logger.debug(`taskkill failed, trying SIGKILL: ${error}`);
              this.currentProcess.kill("SIGKILL");
            }
          } else {
            this.currentProcess.kill("SIGKILL");
          }

          this.currentProcess = null;
        }
        reject(new Error("Command execution aborted"));
      };

      if (signal?.aborted) {
        reject(new Error("Command execution aborted"));
        return;
      }

      signal?.addEventListener("abort", abortHandler, { once: true });

      const args: string[] = ["--headless"];

      // Session management for context continuity
      if (this.currentSessionId) {
        args.push("--session-id", this.currentSessionId);
      } else {
        this.currentSessionId = randomUUID();
        args.push("--session-id", this.currentSessionId);
      }

      // Build the instruction - just pass the user's request directly
      let fullInstruction = instruction;

      // If handoff context exists, add it as background context
      if (conversationHistory && conversationHistory.length > 0) {
        const contextBlock = conversationHistory.map((h) => h.content).join("\n\n");
        fullInstruction = `[CONTEXT FROM PREVIOUS SESSION]\n${contextBlock}\n[END CONTEXT]\n\n${instruction}`;
        logger.debug("Injected handoff context");
      }

      args.push("--prompt", fullInstruction);

      logger.debug(`Spawning Cursor CLI...`);
      logger.debug(`   Command: cursor ${args.join(" ")}`);
      logger.debug(`   Working directory: ${this.projectPath}`);

      const isWindows = process.platform === "win32";
      let command: string;
      let spawnArgs: string[];

      if (isWindows) {
        command = "cmd.exe";
        spawnArgs = ["/c", "cursor", ...args];
      } else {
        command = "cursor";
        spawnArgs = args;
      }

      const child = spawn(command, spawnArgs, {
        cwd: this.projectPath,
        env: process.env,
        stdio: ["inherit", "pipe", "pipe"],
        shell: false,
        windowsHide: true,
      });

      this.currentProcess = child;

      child.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;

        // Send progress update if callback provided
        if (onProgress) {
          onProgress(text);
        }

        // Only log high-level status, skip all code and diffs
        const lines = text.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();

          // Skip all code-related content
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
            trimmed.includes("    ") || // Any indented code (4+ spaces)
            trimmed.length > 150 // Long lines are usually code
          ) {
            continue;
          }

          // Only log important status messages
          if (
            trimmed.includes("thinking") ||
            trimmed.includes("cursor") ||
            trimmed.includes("tokens used") ||
            trimmed.includes("succeeded in") ||
            trimmed.includes("Command executed") ||
            trimmed.startsWith("exec") ||
            trimmed.startsWith("file update") ||
            trimmed.startsWith("apply_patch") ||
            trimmed.startsWith("Success")
          ) {
            logger.debug(trimmed);
          }
        }
      });

      child.stderr.on("data", (data) => {
        const text = data.toString();
        errorOutput += text;
        logger.debug(text.trimEnd());
      });

      child.on("exit", (code, signal) => {
        this.currentProcess = null;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (signal === "SIGTERM") {
          reject(new Error("Process terminated"));
          return;
        }

        if (code === 0) {
          logger.debug(`Command executed successfully! Time: ${elapsed}s`);
          resolve(this.formatResponse(output));
        } else {
          logger.error(`Process exited with code ${code}`);
          reject(new Error(errorOutput || `Process exited with code ${code}`));
        }
      });

      child.on("error", (error) => {
        this.currentProcess = null;
        logger.error("Failed to spawn Cursor CLI", error);

        if (error.message.includes("ENOENT")) {
          reject(
            new Error(
              "Cursor CLI not found in PATH.\n\n" +
                "Please install Cursor IDE first.\n" +
                "Visit: https://cursor.sh\n\n" +
                "After installation, ensure 'cursor' command is in PATH.",
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

    return `Cursor CLI (Headless)
    
Project: ${path.basename(this.projectPath)}
Mode: Headless
Backend: Cursor AI
Cost: Cursor subscription
Privacy: Cloud-based
Session: ${this.currentSessionId || "None"}`;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { exec } = require("child_process");
      await new Promise((resolve, reject) => {
        exec("cursor --version", { timeout: 5000 }, (error: any, stdout: string) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });
      return true;
    } catch (error) {
      logger.debug(`Cursor CLI health check failed: ${error}`);
      return false;
    }
  }

  private formatResponse(output: string): string {
    let formatted = output.trim();
    // Remove ANSI color codes
    formatted = formatted.replace(/\x1b\[[0-9;]*m/g, "");
    return formatted || "Task completed successfully.";
  }
}
