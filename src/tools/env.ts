import fs from "fs";
import path from "path";
import { Tool, ToolDefinition, ToolResult } from "./types";

const SECRET_PATTERNS = [
  /secret/i,
  /key/i,
  /token/i,
  /password/i,
  /passwd/i,
  /credential/i,
  /auth/i,
  /private/i,
  /api_key/i,
  /apikey/i,
  /access/i,
  /jwt/i,
  /encrypt/i,
  /signing/i,
  /certificate/i,
];

function isSensitive(name: string): boolean {
  return SECRET_PATTERNS.some((p) => p.test(name));
}

function maskValue(name: string, value: string, unmask: boolean): string {
  if (unmask) {
    return value;
  }
  if (isSensitive(name)) {
    if (value.length <= 4) {
      return "****";
    }
    return value.substring(0, 2) + "****" + value.substring(value.length - 2);
  }
  return value;
}

export class EnvTool implements Tool {
  name = "env";
  description =
    "Read environment variables and .env files. Actions: list (all vars), get (single var), " +
    "dotenv (read .env file), check (verify multiple vars exist). " +
    "Sensitive values (keys, tokens, passwords) are masked by default — set unmask=true to reveal.";

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
            description: "Action to perform.",
            enum: ["list", "get", "dotenv", "check"],
          },
          name: {
            type: "string",
            description:
              "Variable name (for action=get) or comma-separated names (for action=check).",
          },
          file: {
            type: "string",
            description: "Path to .env file (for action=dotenv). Defaults to .env in project root.",
          },
          filter: {
            type: "string",
            description:
              "Filter env vars by prefix or substring (for action=list). e.g. 'NODE', 'DATABASE'.",
          },
          unmask: {
            type: "boolean",
            description: "Show actual values of sensitive variables (default false).",
          },
        },
        required: ["action"],
      },
    };
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult> {
    if (signal?.aborted) {
      return { toolCallId: "", output: "Env operation aborted", isError: true };
    }

    const action = args.action as string;
    const unmask = args.unmask === true;

    switch (action) {
      case "list":
        return this.actionList(args.filter as string | undefined, unmask);
      case "get":
        return this.actionGet(args.name as string | undefined, unmask);
      case "dotenv":
        return this.actionDotenv(args.file as string | undefined, unmask);
      case "check":
        return this.actionCheck(args.name as string | undefined);
      default:
        return {
          toolCallId: "",
          output: `Unknown action: ${action}. Use: list, get, dotenv, check.`,
          isError: true,
        };
    }
  }

  private actionList(filter: string | undefined, unmask: boolean): ToolResult {
    const env = process.env;
    let entries = Object.entries(env).filter(([, v]) => v !== undefined) as [string, string][];

    if (filter) {
      const upper = filter.toUpperCase();
      entries = entries.filter(([k]) => k.toUpperCase().includes(upper));
    }

    entries.sort(([a], [b]) => a.localeCompare(b));

    if (entries.length === 0) {
      return {
        toolCallId: "",
        output: filter ? `No env vars matching "${filter}".` : "No environment variables found.",
        isError: false,
      };
    }

    const lines = entries.map(([k, v]) => `${k}=${maskValue(k, v, unmask)}`);

    // Cap at 200 entries to protect context
    const capped = lines.length > 200;
    const output = (capped ? lines.slice(0, 200) : lines).join("\n");

    return {
      toolCallId: "",
      output: `${entries.length} variable(s)${filter ? ` matching "${filter}"` : ""}:\n\n${output}${capped ? "\n\n(showing first 200)" : ""}`,
      isError: false,
      metadata: { count: entries.length },
    };
  }

  private actionGet(name: string | undefined, unmask: boolean): ToolResult {
    if (!name) {
      return { toolCallId: "", output: "Error: name is required for action=get.", isError: true };
    }

    const value = process.env[name];
    if (value === undefined) {
      return {
        toolCallId: "",
        output: `${name} is not set.`,
        isError: false,
        metadata: { exists: false },
      };
    }

    return {
      toolCallId: "",
      output: `${name}=${maskValue(name, value, unmask)}`,
      isError: false,
      metadata: { exists: true },
    };
  }

  private actionDotenv(file: string | undefined, unmask: boolean): ToolResult {
    const envFile = file || path.join(this.defaultCwd, ".env");

    if (!fs.existsSync(envFile)) {
      // Try common alternatives
      const alternatives = [".env.local", ".env.development", ".env.example"];
      const found: string[] = [];
      for (const alt of alternatives) {
        const altPath = path.join(this.defaultCwd, alt);
        if (fs.existsSync(altPath)) {
          found.push(alt);
        }
      }

      let msg = `File not found: ${envFile}`;
      if (found.length > 0) {
        msg += `\n\nAvailable .env files: ${found.join(", ")}`;
      }
      return { toolCallId: "", output: msg, isError: true };
    }

    let content: string;
    try {
      content = fs.readFileSync(envFile, "utf-8");
    } catch (err) {
      return {
        toolCallId: "",
        output: `Cannot read ${envFile}: ${err instanceof Error ? err.message : "permission denied"}`,
        isError: true,
      };
    }

    const lines = content.split("\n");
    const result: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        result.push(line);
        continue;
      }

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) {
        result.push(line);
        continue;
      }

      const key = trimmed.substring(0, eqIndex).trim();
      const val = trimmed
        .substring(eqIndex + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      result.push(`${key}=${maskValue(key, val, unmask)}`);
    }

    return {
      toolCallId: "",
      output: `${path.basename(envFile)}:\n\n${result.join("\n")}`,
      isError: false,
    };
  }

  private actionCheck(names: string | undefined): ToolResult {
    if (!names) {
      return {
        toolCallId: "",
        output: "Error: name is required for action=check (comma-separated).",
        isError: true,
      };
    }

    const varNames = names
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    const results: string[] = [];
    let allSet = true;

    for (const name of varNames) {
      const value = process.env[name];
      if (value !== undefined && value !== "") {
        results.push(`  ${name}: set`);
      } else {
        results.push(`  ${name}: NOT SET`);
        allSet = false;
      }
    }

    return {
      toolCallId: "",
      output: `${allSet ? "All variables are set" : "Some variables are missing"}:\n\n${results.join("\n")}`,
      isError: false,
      metadata: { allSet },
    };
  }
}
