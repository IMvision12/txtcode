import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { logger } from "../shared/logger";
import { IDEAdapter } from "../shared/types";

export class KiroAdapter implements IDEAdapter {
  private connected: boolean = false;
  private projectPath: string;
  private currentProcess: ChildProcess | null = null;

  constructor() {
    this.projectPath = process.env.PROJECT_PATH || process.cwd();
  }

  async connect(): Promise<void> {
    logger.debug("Checking prerequisites...");

    try {
      const { exec } = require("child_process");
      await new Promise((resolve, reject) => {
        exec("kiro-cli --version", (error: any, stdout: string) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });
      logger.debug("Kiro CLI installed");
    } catch (error) {
      throw new Error(
        "Kiro CLI not installed.\n\n" +
          "Install it with:\n" +
          "  curl -fsSL https://cli.kiro.dev/install | bash\n\n" +
          "Visit: https://kiro.dev/cli/",
        { cause: error },
      );
    }

    logger.debug(`Connected to Kiro CLI`);
    logger.debug(`   Project: ${this.projectPath}`);
    logger.debug(`   Mode: non-interactive`);

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

    logger.debug(`Processing with Kiro CLI...`);
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

      // Build the instruction - just pass the user's request directly
      let fullInstruction = instruction;

      // If handoff context exists, add it as background context
      if (conversationHistory && conversationHistory.length > 0) {
        const contextBlock = conversationHistory.map((h) => h.content).join("\n\n");
        fullInstruction = `[CONTEXT FROM PREVIOUS SESSION]\n${contextBlock}\n[END CONTEXT]\n\n${instruction}`;
        logger.debug("Injected handoff context into instruction");
      }

      const args: string[] = ["chat", "--no-interactive", fullInstruction];

      logger.debug(`Spawning Kiro CLI...`);
      logger.debug(`   Command: kiro-cli ${args.join(" ")}`);
      logger.debug(`   Working directory: ${this.projectPath}`);

      const isWindows = process.platform === "win32";
      let command: string;
      let spawnArgs: string[];

      if (isWindows) {
        command = "cmd.exe";
        spawnArgs = ["/c", "kiro-cli", ...args];
      } else {
        command = "kiro-cli";
        spawnArgs = args;
      }

      const child = spawn(command, spawnArgs, {
        cwd: this.projectPath,
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
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
            trimmed.includes("kiro") ||
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

        if (code === 0 || output.length > 0) {
          logger.debug(`Command executed successfully! Time: ${elapsed}s`);
          resolve(this.formatResponse(output || "Task completed successfully."));
        } else {
          logger.error(`Process exited with code ${code}`);
          reject(new Error(errorOutput || `Process exited with code ${code}`));
        }
      });

      child.on("error", (error) => {
        this.currentProcess = null;
        logger.error("Failed to spawn Kiro CLI", error);

        if (error.message.includes("ENOENT")) {
          reject(
            new Error(
              "Kiro CLI not found in PATH.\n\n" +
                "Install it with:\n" +
                "  curl -fsSL https://cli.kiro.dev/install | bash\n\n" +
                "Visit: https://kiro.dev/cli/",
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

    return `Kiro CLI

Project: ${path.basename(this.projectPath)}
Backend: AWS (Claude models)
Cost: Kiro subscription / credits
Privacy: Cloud-based
Session: Stateless (per-invocation)`;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { exec } = require("child_process");
      await new Promise((resolve, reject) => {
        exec("kiro-cli --version", { timeout: 5000 }, (error: any, stdout: string) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });
      return true;
    } catch (error) {
      logger.debug(`Kiro CLI health check failed: ${error}`);
      return false;
    }
  }

  private formatResponse(output: string): string {
    let formatted = output.trim();
    formatted = formatted.replace(/\x1b\[[0-9;]*m/g, "");
    return formatted || "Task completed successfully.";
  }
}
