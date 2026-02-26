import { execFile, exec } from "child_process";
import { Tool, ToolDefinition, ToolResult } from "./types";

const CMD_TIMEOUT = 15_000;

function runCommand(
  cmd: string,
  args: string[],
  timeout: number = CMD_TIMEOUT,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 512 * 1024 }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout?.toString() ?? "",
        stderr: stderr?.toString() ?? "",
        code: err ? ((err as { code?: number }).code ?? 1) : 0,
      });
    });
  });
}

function runShell(
  command: string,
  timeout: number = CMD_TIMEOUT,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    exec(command, { timeout, maxBuffer: 512 * 1024 }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout?.toString() ?? "",
        stderr: stderr?.toString() ?? "",
        code: err ? ((err as { code?: number }).code ?? 1) : 0,
      });
    });
  });
}

export class CronTool implements Tool {
  name = "cron";
  description =
    "Manage scheduled tasks and cron jobs. Actions: list (show all scheduled tasks), " +
    "get (details of a specific task), add (create a scheduled task), remove (delete a task). " +
    "Uses crontab on Linux/macOS and schtasks on Windows.";

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "Action to perform.",
            enum: ["list", "get", "add", "remove"],
          },
          name: {
            type: "string",
            description:
              "Task name (required for get, add, remove). On Unix, used as a comment identifier in crontab.",
          },
          schedule: {
            type: "string",
            description:
              "Schedule expression. Unix: cron expression (e.g. '0 2 * * *'). Windows: schtasks schedule (e.g. '/sc daily /st 02:00').",
          },
          command: {
            type: "string",
            description: "Command to execute (required for add).",
          },
          confirm: {
            type: "boolean",
            description: "Confirm destructive action (required true for add/remove).",
          },
        },
        required: ["action"],
      },
    };
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult> {
    if (signal?.aborted) {
      return { toolCallId: "", output: "Cron operation aborted", isError: true };
    }

    const action = args.action as string;
    const isWindows = process.platform === "win32";

    switch (action) {
      case "list":
        return isWindows ? this.listWindows() : this.listUnix();
      case "get":
        return isWindows ? this.getWindows(args.name as string) : this.getUnix(args.name as string);
      case "add":
        return this.addTask(args, isWindows);
      case "remove":
        return this.removeTask(args, isWindows);
      default:
        return {
          toolCallId: "",
          output: `Unknown action: ${action}. Use: list, get, add, remove.`,
          isError: true,
        };
    }
  }

  private async listUnix(): Promise<ToolResult> {
    const result = await runCommand("crontab", ["-l"]);

    if (result.code !== 0) {
      if (result.stderr.includes("no crontab")) {
        return {
          toolCallId: "",
          output: "No crontab configured for current user.",
          isError: false,
        };
      }
      return {
        toolCallId: "",
        output: `Failed to list crontab: ${result.stderr.trim()}`,
        isError: true,
      };
    }

    const lines = result.stdout.trim().split("\n");
    const jobs: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      if (trimmed.startsWith("#")) {
        jobs.push(trimmed);
        continue;
      }
      jobs.push(trimmed);
    }

    if (jobs.length === 0) {
      return { toolCallId: "", output: "Crontab is empty.", isError: false };
    }

    return {
      toolCallId: "",
      output: `Crontab entries:\n\n${jobs.join("\n")}`,
      isError: false,
      metadata: { count: jobs.length },
    };
  }

  private async listWindows(): Promise<ToolResult> {
    const result = await runCommand("schtasks.exe", ["/query", "/fo", "TABLE", "/nh"]);

    if (result.code !== 0) {
      return {
        toolCallId: "",
        output: `Failed to list scheduled tasks: ${result.stderr.trim()}`,
        isError: true,
      };
    }

    const output = result.stdout.trim();
    if (!output) {
      return { toolCallId: "", output: "No scheduled tasks found.", isError: false };
    }

    return { toolCallId: "", output: `Scheduled tasks:\n\n${output}`, isError: false };
  }

  private async getUnix(name: string | undefined): Promise<ToolResult> {
    if (!name) {
      return { toolCallId: "", output: "Error: name is required for get.", isError: true };
    }

    const result = await runCommand("crontab", ["-l"]);
    if (result.code !== 0) {
      return {
        toolCallId: "",
        output: `Failed to read crontab: ${result.stderr.trim()}`,
        isError: true,
      };
    }

    const lines = result.stdout.split("\n");
    const matching: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(name)) {
        matching.push(lines[i].trim());
      }
    }

    if (matching.length === 0) {
      return { toolCallId: "", output: `No crontab entry matching "${name}".`, isError: false };
    }

    return {
      toolCallId: "",
      output: `Entries matching "${name}":\n\n${matching.join("\n")}`,
      isError: false,
    };
  }

  private async getWindows(name: string | undefined): Promise<ToolResult> {
    if (!name) {
      return { toolCallId: "", output: "Error: name is required for get.", isError: true };
    }

    const result = await runCommand("schtasks.exe", ["/query", "/tn", name, "/v", "/fo", "LIST"]);

    if (result.code !== 0) {
      return {
        toolCallId: "",
        output: `Task "${name}" not found: ${result.stderr.trim()}`,
        isError: true,
      };
    }

    return { toolCallId: "", output: result.stdout.trim(), isError: false };
  }

  private async addTask(args: Record<string, unknown>, isWindows: boolean): Promise<ToolResult> {
    const name = (args.name as string)?.trim();
    const schedule = (args.schedule as string)?.trim();
    const command = (args.command as string)?.trim();
    const confirm = args.confirm === true;

    if (!name) {
      return { toolCallId: "", output: "Error: name is required for add.", isError: true };
    }
    if (!schedule) {
      return { toolCallId: "", output: "Error: schedule is required for add.", isError: true };
    }
    if (!command) {
      return { toolCallId: "", output: "Error: command is required for add.", isError: true };
    }
    if (!confirm) {
      return {
        toolCallId: "",
        output: `This will add a scheduled task:\n  Name: ${name}\n  Schedule: ${schedule}\n  Command: ${command}\n\nSet confirm=true to proceed.`,
        isError: false,
      };
    }

    if (isWindows) {
      const schtasksArgs = ["/create", "/tn", name, "/tr", command];
      const scheduleParts = schedule.split(/\s+/);
      schtasksArgs.push(...scheduleParts);
      schtasksArgs.push("/f");

      const result = await runCommand("schtasks.exe", schtasksArgs);
      if (result.code !== 0) {
        return {
          toolCallId: "",
          output: `Failed to create task: ${(result.stdout + result.stderr).trim()}`,
          isError: true,
        };
      }
      return { toolCallId: "", output: `Task "${name}" created successfully.`, isError: false };
    }

    // Unix: append to crontab
    const cronLine = `${schedule} ${command} # ${name}`;
    const existing = await runCommand("crontab", ["-l"]);
    const currentCrontab = existing.code === 0 ? existing.stdout : "";
    const newCrontab = currentCrontab.trimEnd() + "\n" + cronLine + "\n";

    const result = await runShell(`echo '${newCrontab.replace(/'/g, "'\\''")}' | crontab -`);
    if (result.code !== 0) {
      return {
        toolCallId: "",
        output: `Failed to add cron job: ${result.stderr.trim()}`,
        isError: true,
      };
    }

    return { toolCallId: "", output: `Cron job "${name}" added:\n  ${cronLine}`, isError: false };
  }

  private async removeTask(args: Record<string, unknown>, isWindows: boolean): Promise<ToolResult> {
    const name = (args.name as string)?.trim();
    const confirm = args.confirm === true;

    if (!name) {
      return { toolCallId: "", output: "Error: name is required for remove.", isError: true };
    }
    if (!confirm) {
      return {
        toolCallId: "",
        output: `This will remove the scheduled task "${name}". Set confirm=true to proceed.`,
        isError: false,
      };
    }

    if (isWindows) {
      const result = await runCommand("schtasks.exe", ["/delete", "/tn", name, "/f"]);
      if (result.code !== 0) {
        return {
          toolCallId: "",
          output: `Failed to remove task: ${(result.stdout + result.stderr).trim()}`,
          isError: true,
        };
      }
      return { toolCallId: "", output: `Task "${name}" removed.`, isError: false };
    }

    // Unix: remove matching lines from crontab
    const existing = await runCommand("crontab", ["-l"]);
    if (existing.code !== 0) {
      return {
        toolCallId: "",
        output: `No crontab to modify: ${existing.stderr.trim()}`,
        isError: true,
      };
    }

    const lines = existing.stdout.split("\n");
    const filtered = lines.filter((line) => !line.includes(name));

    if (filtered.length === lines.length) {
      return { toolCallId: "", output: `No crontab entry matching "${name}".`, isError: false };
    }

    const newCrontab = filtered.join("\n");
    const result = await runShell(`echo '${newCrontab.replace(/'/g, "'\\''")}' | crontab -`);
    if (result.code !== 0) {
      return {
        toolCallId: "",
        output: `Failed to update crontab: ${result.stderr.trim()}`,
        isError: true,
      };
    }

    return { toolCallId: "", output: `Cron job "${name}" removed.`, isError: false };
  }
}
