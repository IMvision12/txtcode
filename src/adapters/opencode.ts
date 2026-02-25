import { spawn, ChildProcess } from "child_process";
import { randomUUID } from "crypto";
import path from "path";
import { logger } from "../shared/logger";
import { IDEAdapter } from "../shared/types";

export class OpenCodeAdapter implements IDEAdapter {
  private connected: boolean = false;
  private projectPath: string;
  private currentProcess: ChildProcess | null = null;
  private sessionId: string | null = null;

  constructor() {
    this.projectPath = process.env.PROJECT_PATH || process.cwd();
  }

  async connect(): Promise<void> {
    logger.debug("Checking OpenCode prerequisites...");

    try {
      const { exec } = require("child_process");
      await new Promise((resolve, reject) => {
        exec("opencode --version", (error: any, stdout: string) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });
      logger.debug("OpenCode CLI installed");
    } catch (error) {
      throw new Error(
        "OpenCode CLI not installed.\n\n" +
          "Please install OpenCode CLI first:\n" +
          "  curl -fsSL https://raw.githubusercontent.com/opencode-ai/opencode/refs/heads/main/install | bash\n" +
          "Or using Homebrew:\n" +
          "  brew install opencode-ai/tap/opencode\n\n" +
          "Note: OpenCode has been archived and moved to 'Crush'. Consider using Crush instead.\n" +
          "Visit: https://github.com/opencode-ai/opencode",
        { cause: error },
      );
    }

    logger.debug(`Connected to OpenCode`);
    logger.debug(`   Project: ${this.projectPath}`);
    logger.debug(`   Mode: Terminal-based AI assistant`);

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
      logger.debug("Aborting current OpenCode process...");

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

    logger.debug(`Processing with OpenCode...`);
    logger.debug(`   Instruction: ${instruction}`);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = "";
      let errorOutput = "";

      // Handle abort signal
      const abortHandler = () => {
        if (this.currentProcess) {
          logger.debug("Aborting OpenCode execution...");

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

      const args: string[] = [];

      // OpenCode uses sessions for context management
      if (!this.sessionId) {
        this.sessionId = randomUUID();
      }

      // Use non-interactive mode for programmatic access
      args.push("--non-interactive");

      // Add session ID if available
      args.push("--session", this.sessionId);

      // Build the instruction
      let fullInstruction = instruction;

      // If handoff context exists, add it as background context
      if (conversationHistory && conversationHistory.length > 0) {
        const contextBlock = conversationHistory.map((h) => h.content).join("\n\n");
        fullInstruction = `[CONTEXT FROM PREVIOUS SESSION]\n${contextBlock}\n[END CONTEXT]\n\n${instruction}`;
        logger.debug("Injected handoff context");
      }

      // Add the instruction as the message
      args.push("--message", fullInstruction);

      logger.debug(`Spawning OpenCode CLI...`);
      logger.debug(`   Command: opencode ${args.join(" ")}`);
      logger.debug(`   Working directory: ${this.projectPath}`);

      const isWindows = process.platform === "win32";
      let command: string;
      let spawnArgs: string[];

      if (isWindows) {
        command = "cmd.exe";
        spawnArgs = ["/c", "opencode", ...args];
      } else {
        command = "opencode";
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

        // Log important status messages
        const lines = text.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();

          // Skip code diffs and long lines
          if (
            trimmed.startsWith("+") ||
            trimmed.startsWith("-") ||
            trimmed.startsWith("@@") ||
            trimmed.startsWith("diff ") ||
            trimmed.length > 150
          ) {
            continue;
          }

          // Log important status messages
          if (
            trimmed.includes("thinking") ||
            trimmed.includes("opencode") ||
            trimmed.includes("tokens") ||
            trimmed.includes("completed") ||
            trimmed.includes("success") ||
            trimmed.toLowerCase().includes("error")
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
          logger.debug(`OpenCode command executed successfully! Time: ${elapsed}s`);
          resolve(this.formatResponse(output));
        } else {
          logger.error(`OpenCode process exited with code ${code}`);
          reject(new Error(errorOutput || `Process exited with code ${code}`));
        }
      });

      child.on("error", (error) => {
        this.currentProcess = null;
        logger.error("Failed to spawn OpenCode CLI", error);

        if (error.message.includes("ENOENT")) {
          reject(
            new Error(
              "OpenCode CLI not found in PATH.\n\n" +
                "Please install OpenCode CLI first:\n" +
                "  curl -fsSL https://raw.githubusercontent.com/opencode-ai/opencode/refs/heads/main/install | bash\n" +
                "Or using Homebrew:\n" +
                "  brew install opencode-ai/tap/opencode\n\n" +
                "Note: OpenCode has been archived. Consider using Crush instead.\n" +
                "Visit: https://github.com/opencode-ai/opencode",
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

    return `OpenCode (Terminal AI Assistant)
    
Project: ${path.basename(this.projectPath)}
Backend: Configured AI provider (OpenAI, Anthropic, Gemini, etc.)
Session: ${this.sessionId || "None"}
Note: OpenCode has been archived and moved to 'Crush'

Features:
- Multiple AI provider support
- Session management
- Tool integration
- File change tracking`;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { exec } = require("child_process");
      await new Promise((resolve, reject) => {
        exec("opencode --version", { timeout: 5000 }, (error: any, stdout: string) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });
      return true;
    } catch (error) {
      logger.debug(`OpenCode CLI health check failed: ${error}`);
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
