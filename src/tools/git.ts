import { execFile } from "child_process";
import { killProcessTree } from "../shared/process-kill";
import { Tool, ToolDefinition, ToolResult } from "./types";

const BLOCKED_PATTERNS = [
  /push\s+.*--force/i,
  /push\s+.*-f\b/i,
  /config\s+.*credential/i,
  /config\s+.*user\.(name|email)/i,
];

const MAX_OUTPUT = 50_000;

function runGit(
  args: string[],
  cwd: string,
  signal?: AbortSignal,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    const proc = execFile(
      "git",
      args,
      { cwd, maxBuffer: 1024 * 1024, timeout: 30_000 },
      (err, stdout, stderr) => {
        resolve({
          stdout: stdout?.toString() ?? "",
          stderr: stderr?.toString() ?? "",
          code: err ? ((err as { code?: number }).code ?? 1) : 0,
        });
      },
    );

    if (signal) {
      const handler = () => {
        killProcessTree(proc);
      };
      signal.addEventListener("abort", handler, { once: true });
      proc.on("exit", () => signal.removeEventListener("abort", handler));
    }
  });
}

function truncate(text: string): string {
  if (text.length > MAX_OUTPUT) {
    return text.slice(0, MAX_OUTPUT) + "\n\n(output truncated)";
  }
  return text;
}

export class GitTool implements Tool {
  name = "git";
  description =
    "Run git operations on the local repository. Actions: status, diff, log, branch, commit, stash, checkout, add, reset, remote, show, blame. " +
    "Destructive operations (push --force, reset --hard) are blocked unless force=true.";

  private defaultCwd: string;

  constructor(opts?: { cwd?: string }) {
    this.defaultCwd = opts?.cwd || process.env.PROJECT_PATH || process.cwd();
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "Git action to perform.",
            enum: [
              "status",
              "diff",
              "log",
              "branch",
              "commit",
              "stash",
              "checkout",
              "add",
              "reset",
              "remote",
              "show",
              "blame",
              "tag",
              "pull",
              "push",
              "fetch",
              "merge",
              "rebase",
              "cherry-pick",
            ],
          },
          args: {
            type: "string",
            description:
              "Additional arguments (e.g. branch name, file path, --oneline, -n 10). Passed directly to git.",
          },
          message: {
            type: "string",
            description: "Commit message (used with action=commit).",
          },
          workdir: {
            type: "string",
            description: "Working directory. Defaults to project root.",
          },
          force: {
            type: "boolean",
            description:
              "Allow destructive operations like push --force or reset --hard. Default false.",
          },
        },
        required: ["action"],
      },
    };
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult> {
    if (signal?.aborted) {
      return { toolCallId: "", output: "Git operation aborted", isError: true };
    }

    const action = args.action as string;
    const extraArgs = (args.args as string)?.trim() || "";
    const message = (args.message as string)?.trim() || "";
    const workdir = (args.workdir as string)?.trim() || this.defaultCwd;
    const force = args.force === true;

    const fullCommand = `${action} ${extraArgs}`.trim();
    if (!force) {
      for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(fullCommand)) {
          return {
            toolCallId: "",
            output: `Blocked: "${fullCommand}" is a destructive operation. Set force=true to proceed.`,
            isError: true,
          };
        }
      }

      if (action === "reset" && extraArgs.includes("--hard") && !force) {
        return {
          toolCallId: "",
          output: `Blocked: "reset --hard" will discard changes. Set force=true to proceed.`,
          isError: true,
        };
      }
    }

    let gitArgs: string[];

    switch (action) {
      case "status":
        gitArgs = ["status", "--short", "--branch"];
        if (extraArgs) {
          gitArgs.push(...extraArgs.split(/\s+/));
        }
        break;

      case "diff":
        gitArgs = ["diff"];
        if (extraArgs) {
          gitArgs.push(...extraArgs.split(/\s+/));
        } else {
          gitArgs.push("--stat");
        }
        break;

      case "log":
        gitArgs = ["log", "--oneline"];
        if (extraArgs) {
          gitArgs.push(...extraArgs.split(/\s+/));
        } else {
          gitArgs.push("-20");
        }
        break;

      case "commit":
        if (!message) {
          return {
            toolCallId: "",
            output: "Error: commit requires a message parameter.",
            isError: true,
          };
        }
        gitArgs = ["commit", "-m", message];
        if (extraArgs) {
          gitArgs.push(...extraArgs.split(/\s+/));
        }
        break;

      case "branch":
        gitArgs = ["branch"];
        if (extraArgs) {
          gitArgs.push(...extraArgs.split(/\s+/));
        } else {
          gitArgs.push("-a");
        }
        break;

      default:
        gitArgs = [action];
        if (extraArgs) {
          gitArgs.push(...extraArgs.split(/\s+/));
        }
        break;
    }

    const result = await runGit(gitArgs, workdir, signal);
    const output = (result.stdout + (result.stderr ? "\n" + result.stderr : "")).trim();

    return {
      toolCallId: "",
      output: truncate(output || "(no output)"),
      isError: result.code !== 0 && result.code !== null,
      metadata: { exitCode: result.code, action },
    };
  }
}
