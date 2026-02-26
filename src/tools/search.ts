import fs from "fs";
import path from "path";
import { Tool, ToolDefinition, ToolResult } from "./types";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "__pycache__",
  ".cache",
  ".venv",
  "venv",
  "vendor",
  "target",
  ".gradle",
  ".idea",
  ".vs",
  "coverage",
  ".nyc_output",
  ".turbo",
  ".parcel-cache",
]);

const MAX_RESULTS = 200;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_MATCH_CONTEXT = 200;

function walkDir(
  dir: string,
  callback: (filePath: string, stat: fs.Stats) => boolean,
  depth: number = 0,
  maxDepth: number = 20,
): void {
  if (depth > maxDepth) {
    return;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }
    if (entry.name.startsWith(".") && entry.name !== ".env" && depth > 0) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDir(fullPath, callback, depth + 1, maxDepth);
    } else if (entry.isFile()) {
      try {
        const stat = fs.statSync(fullPath);
        const shouldStop = callback(fullPath, stat);
        if (shouldStop) {
          return;
        }
      } catch {}
    }
  }
}

function matchGlob(filename: string, pattern: string): boolean {
  const regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${regex}$`, "i").test(filename);
}

export class SearchTool implements Tool {
  name = "search";
  description =
    "Search files and file contents in the project. Actions: grep (search content by regex/text), " +
    "glob (find files by name pattern), find (find files by extension/size/date). " +
    "Auto-skips node_modules, .git, dist, build. Results capped at 200.";

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
            description: "Search action to perform.",
            enum: ["grep", "glob", "find"],
          },
          pattern: {
            type: "string",
            description:
              "Search pattern. For grep: regex or text. For glob: file pattern (e.g. *.ts, *.py). For find: file extension (e.g. ts, py).",
          },
          path: {
            type: "string",
            description: "Directory to search in. Defaults to project root.",
          },
          case_sensitive: {
            type: "boolean",
            description: "Case-sensitive search (default false for grep, true for glob/find).",
          },
          max_results: {
            type: "number",
            description: `Maximum results to return (default ${MAX_RESULTS}).`,
          },
          include: {
            type: "string",
            description:
              "Only search files matching this glob pattern (e.g. *.ts, *.py). For grep action.",
          },
        },
        required: ["action", "pattern"],
      },
    };
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult> {
    if (signal?.aborted) {
      return { toolCallId: "", output: "Search aborted", isError: true };
    }

    const action = args.action as string;
    const pattern = args.pattern as string;
    const searchPath = (args.path as string)?.trim() || this.defaultCwd;
    const caseSensitive = args.case_sensitive === true;
    const maxResults =
      typeof args.max_results === "number" ? Math.min(args.max_results, MAX_RESULTS) : MAX_RESULTS;
    const include = (args.include as string)?.trim() || "";

    if (!pattern) {
      return { toolCallId: "", output: "Error: pattern is required.", isError: true };
    }

    if (!fs.existsSync(searchPath)) {
      return { toolCallId: "", output: `Error: path does not exist: ${searchPath}`, isError: true };
    }

    switch (action) {
      case "grep":
        return this.actionGrep(searchPath, pattern, caseSensitive, maxResults, include);
      case "glob":
        return this.actionGlob(searchPath, pattern, maxResults);
      case "find":
        return this.actionFind(searchPath, pattern, maxResults);
      default:
        return {
          toolCallId: "",
          output: `Unknown action: ${action}. Use: grep, glob, find.`,
          isError: true,
        };
    }
  }

  private actionGrep(
    searchPath: string,
    pattern: string,
    caseSensitive: boolean,
    maxResults: number,
    include: string,
  ): ToolResult {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, caseSensitive ? "g" : "gi");
    } catch {
      regex = new RegExp(
        pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        caseSensitive ? "g" : "gi",
      );
    }

    const matches: string[] = [];
    let fileCount = 0;

    walkDir(searchPath, (filePath, stat) => {
      if (stat.size > MAX_FILE_SIZE) {
        return false;
      }
      if (include && !matchGlob(path.basename(filePath), include)) {
        return false;
      }

      let content: string;
      try {
        content = fs.readFileSync(filePath, "utf-8");
      } catch {
        return false;
      }

      // Skip binary files
      if (content.includes("\0")) {
        return false;
      }

      const lines = content.split("\n");
      const relativePath = path.relative(searchPath, filePath);
      let fileHasMatch = false;

      for (let i = 0; i < lines.length; i++) {
        regex.lastIndex = 0;
        if (regex.test(lines[i])) {
          if (!fileHasMatch) {
            fileHasMatch = true;
            fileCount++;
          }
          const lineContent =
            lines[i].length > MAX_MATCH_CONTEXT
              ? lines[i].substring(0, MAX_MATCH_CONTEXT) + "..."
              : lines[i];
          matches.push(`${relativePath}:${i + 1}: ${lineContent.trim()}`);

          if (matches.length >= maxResults) {
            return true;
          }
        }
      }
      return false;
    });

    if (matches.length === 0) {
      return { toolCallId: "", output: `No matches found for "${pattern}".`, isError: false };
    }

    const header = `Found ${matches.length} match(es) in ${fileCount} file(s):\n\n`;
    return {
      toolCallId: "",
      output: header + matches.join("\n"),
      isError: false,
      metadata: { matchCount: matches.length, fileCount },
    };
  }

  private actionGlob(searchPath: string, pattern: string, maxResults: number): ToolResult {
    const results: string[] = [];

    walkDir(searchPath, (filePath) => {
      const filename = path.basename(filePath);
      if (matchGlob(filename, pattern)) {
        results.push(path.relative(searchPath, filePath));
        if (results.length >= maxResults) {
          return true;
        }
      }
      return false;
    });

    if (results.length === 0) {
      return { toolCallId: "", output: `No files matching "${pattern}".`, isError: false };
    }

    return {
      toolCallId: "",
      output: `Found ${results.length} file(s):\n\n${results.join("\n")}`,
      isError: false,
      metadata: { count: results.length },
    };
  }

  private actionFind(searchPath: string, pattern: string, maxResults: number): ToolResult {
    const ext = pattern.startsWith(".") ? pattern : `.${pattern}`;
    const results: { path: string; size: string; modified: string }[] = [];

    walkDir(searchPath, (filePath, stat) => {
      if (filePath.endsWith(ext)) {
        results.push({
          path: path.relative(searchPath, filePath),
          size: formatSize(stat.size),
          modified: stat.mtime.toISOString().split("T")[0],
        });
        if (results.length >= maxResults) {
          return true;
        }
      }
      return false;
    });

    if (results.length === 0) {
      return { toolCallId: "", output: `No files with extension "${ext}".`, isError: false };
    }

    const lines = results.map((r) => `${r.path}  (${r.size}, ${r.modified})`);
    return {
      toolCallId: "",
      output: `Found ${results.length} ${ext} file(s):\n\n${lines.join("\n")}`,
      isError: false,
      metadata: { count: results.length },
    };
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
