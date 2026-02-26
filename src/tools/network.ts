import { execFile } from "child_process";
import dns from "dns";
import { Tool, ToolDefinition, ToolResult } from "./types";

const PING_TIMEOUT = 10_000;
const REACHABLE_TIMEOUT = 10_000;

function runCommand(
  cmd: string,
  args: string[],
  timeout: number = PING_TIMEOUT,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 512 * 1024 }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout?.toString() ?? "",
        stderr: stderr?.toString() ?? "",
        code: err ? (err as { code?: number }).code ?? 1 : 0,
      });
    });
  });
}

export class NetworkTool implements Tool {
  name = "network";
  description =
    "Network diagnostics. Actions: ping (ICMP ping a host), dns (DNS lookup), " +
    "reachable (check if URL/host responds), ports (list listening ports or check a specific port). " +
    "Works on Windows, macOS, and Linux.";

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "Network action to perform.",
            enum: ["ping", "dns", "reachable", "ports"],
          },
          target: {
            type: "string",
            description: "Hostname, IP, or URL (for ping, dns, reachable).",
          },
          port: {
            type: "number",
            description: "Specific port to check (for action=ports).",
          },
          count: {
            type: "number",
            description: "Number of ping packets (default 4).",
          },
        },
        required: ["action"],
      },
    };
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult> {
    if (signal?.aborted) {
      return { toolCallId: "", output: "Network operation aborted", isError: true };
    }

    const action = args.action as string;
    const target = (args.target as string)?.trim() || "";
    const port = args.port as number | undefined;
    const count = typeof args.count === "number" ? Math.min(args.count, 20) : 4;

    switch (action) {
      case "ping":
        return this.actionPing(target, count);
      case "dns":
        return this.actionDns(target);
      case "reachable":
        return this.actionReachable(target);
      case "ports":
        return this.actionPorts(port);
      default:
        return { toolCallId: "", output: `Unknown action: ${action}. Use: ping, dns, reachable, ports.`, isError: true };
    }
  }

  private async actionPing(target: string, count: number): Promise<ToolResult> {
    if (!target) {
      return { toolCallId: "", output: "Error: target is required for ping.", isError: true };
    }

    const isWindows = process.platform === "win32";
    const pingArgs = isWindows
      ? ["-n", String(count), target]
      : ["-c", String(count), "-W", "5", target];

    const result = await runCommand("ping", pingArgs, PING_TIMEOUT + count * 2000);
    const output = (result.stdout + result.stderr).trim();

    return {
      toolCallId: "",
      output: output || `Ping to ${target} completed (exit code ${result.code}).`,
      isError: result.code !== 0,
      metadata: { target, exitCode: result.code },
    };
  }

  private async actionDns(target: string): Promise<ToolResult> {
    if (!target) {
      return { toolCallId: "", output: "Error: target is required for dns.", isError: true };
    }

    // Strip protocol if URL was passed
    const hostname = target.replace(/^https?:\/\//, "").replace(/[:/].*$/, "");

    try {
      const resolver = new dns.promises.Resolver();
      resolver.setServers(["8.8.8.8", "1.1.1.1"]);

      const results: string[] = [`DNS lookup for ${hostname}:\n`];

      try {
        const a = await resolver.resolve4(hostname);
        results.push(`A records:    ${a.join(", ")}`);
      } catch {}

      try {
        const aaaa = await resolver.resolve6(hostname);
        results.push(`AAAA records: ${aaaa.join(", ")}`);
      } catch {}

      try {
        const mx = await resolver.resolveMx(hostname);
        const mxStr = mx.map((r) => `${r.exchange} (priority ${r.priority})`).join(", ");
        results.push(`MX records:   ${mxStr}`);
      } catch {}

      try {
        const cname = await resolver.resolveCname(hostname);
        results.push(`CNAME:        ${cname.join(", ")}`);
      } catch {}

      try {
        const ns = await resolver.resolveNs(hostname);
        results.push(`NS records:   ${ns.join(", ")}`);
      } catch {}

      try {
        const txt = await resolver.resolveTxt(hostname);
        const txtStr = txt.map((t) => t.join("")).slice(0, 5);
        if (txtStr.length > 0) {
          results.push(`TXT records:  ${txtStr.join("; ")}`);
        }
      } catch {}

      return {
        toolCallId: "",
        output: results.length > 1 ? results.join("\n") : `No DNS records found for ${hostname}.`,
        isError: results.length <= 1,
      };
    } catch (err) {
      return { toolCallId: "", output: `DNS lookup failed for ${hostname}: ${err instanceof Error ? err.message : String(err)}`, isError: true };
    }
  }

  private async actionReachable(target: string): Promise<ToolResult> {
    if (!target) {
      return { toolCallId: "", output: "Error: target is required for reachable.", isError: true };
    }

    let url = target;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REACHABLE_TIMEOUT);

    try {
      const start = Date.now();
      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });
      const elapsed = Date.now() - start;

      return {
        toolCallId: "",
        output: `${target} is reachable.\n  Status: ${response.status} ${response.statusText}\n  Response time: ${elapsed}ms`,
        isError: false,
        metadata: { reachable: true, status: response.status, elapsed },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("abort")) {
        return { toolCallId: "", output: `${target} is not reachable (timed out after ${REACHABLE_TIMEOUT}ms).`, isError: false, metadata: { reachable: false } };
      }
      return { toolCallId: "", output: `${target} is not reachable: ${message}`, isError: false, metadata: { reachable: false } };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async actionPorts(port?: number): Promise<ToolResult> {
    const isWindows = process.platform === "win32";
    const isMac = process.platform === "darwin";

    let result: { stdout: string; stderr: string; code: number | null };

    if (isWindows) {
      if (port) {
        result = await runCommand("powershell.exe", [
          "-NoProfile", "-NonInteractive", "-Command",
          `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ` +
          `Select-Object LocalAddress, LocalPort, OwningProcess | Format-Table -AutoSize`,
        ]);
      } else {
        result = await runCommand("powershell.exe", [
          "-NoProfile", "-NonInteractive", "-Command",
          `Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | ` +
          `Select-Object LocalAddress, LocalPort, OwningProcess | Sort-Object LocalPort | Format-Table -AutoSize`,
        ]);
      }
    } else if (isMac) {
      if (port) {
        result = await runCommand("lsof", ["-iTCP:" + port, "-sTCP:LISTEN", "-P", "-n"]);
      } else {
        result = await runCommand("lsof", ["-iTCP", "-sTCP:LISTEN", "-P", "-n"]);
      }
    } else {
      // Linux
      if (port) {
        result = await runCommand("ss", ["-tlnp", "sport", "=", String(port)]);
      } else {
        result = await runCommand("ss", ["-tlnp"]);
      }
    }

    const output = (result.stdout + result.stderr).trim();

    if (!output || result.code !== 0) {
      if (port) {
        return { toolCallId: "", output: `No process listening on port ${port}.`, isError: false };
      }
      return { toolCallId: "", output: output || "Could not retrieve listening ports.", isError: result.code !== 0 };
    }

    return {
      toolCallId: "",
      output: port ? `Port ${port}:\n\n${output}` : `Listening ports:\n\n${output}`,
      isError: false,
    };
  }
}
