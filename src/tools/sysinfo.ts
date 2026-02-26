import { execFile } from "child_process";
import os from "os";
import { Tool, ToolDefinition, ToolResult } from "./types";

const CMD_TIMEOUT = 10_000;

function runCommand(cmd: string, args: string[], timeout: number = CMD_TIMEOUT): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 512 * 1024 }, (err, stdout) => {
      resolve(stdout?.toString().trim() ?? "");
    });
  });
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

export class SysinfoTool implements Tool {
  name = "sysinfo";
  description =
    "System information and resource monitoring. Actions: overview (full summary), cpu, memory, " +
    "disk, uptime, processes (top resource consumers). Works on Windows, macOS, and Linux.";

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "Info to retrieve.",
            enum: ["overview", "cpu", "memory", "disk", "uptime", "processes"],
          },
          count: {
            type: "number",
            description: "Number of top processes to show (default 15, for action=processes).",
          },
        },
        required: ["action"],
      },
    };
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult> {
    if (signal?.aborted) {
      return { toolCallId: "", output: "Sysinfo operation aborted", isError: true };
    }

    const action = args.action as string;
    const count = typeof args.count === "number" ? Math.min(args.count, 50) : 15;

    switch (action) {
      case "overview":
        return this.actionOverview();
      case "cpu":
        return this.actionCpu();
      case "memory":
        return this.actionMemory();
      case "disk":
        return this.actionDisk();
      case "uptime":
        return this.actionUptime();
      case "processes":
        return this.actionProcesses(count);
      default:
        return {
          toolCallId: "",
          output: `Unknown action: ${action}. Use: overview, cpu, memory, disk, uptime, processes.`,
          isError: true,
        };
    }
  }

  private async actionOverview(): Promise<ToolResult> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

    const platformNames: Record<string, string> = {
      win32: "Windows",
      darwin: "macOS",
      linux: "Linux",
      freebsd: "FreeBSD",
    };

    const lines = [
      `System Overview`,
      ``,
      `Hostname:  ${os.hostname()}`,
      `Platform:  ${platformNames[os.platform()] || os.platform()} (${os.arch()})`,
      `OS:        ${os.release()}`,
      `Uptime:    ${formatUptime(os.uptime())}`,
      ``,
      `CPU:       ${cpus[0]?.model || "Unknown"} (${cpus.length} cores)`,
      `Memory:    ${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${memPercent}% used)`,
      `Free mem:  ${formatBytes(freeMem)}`,
      ``,
      `Home dir:  ${os.homedir()}`,
      `Temp dir:  ${os.tmpdir()}`,
      `Node.js:   ${process.version}`,
    ];

    // Add load average on Unix
    if (os.platform() !== "win32") {
      const load = os.loadavg();
      lines.push(`Load avg:  ${load.map((l) => l.toFixed(2)).join(", ")} (1m, 5m, 15m)`);
    }

    return { toolCallId: "", output: lines.join("\n"), isError: false };
  }

  private actionCpu(): ToolResult {
    const cpus = os.cpus();
    const lines = [
      `CPU: ${cpus[0]?.model || "Unknown"}`,
      `Cores: ${cpus.length}`,
      `Architecture: ${os.arch()}`,
      ``,
    ];

    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      const usage = (((total - idle) / total) * 100).toFixed(1);
      lines.push(`  Core ${i}: ${cpu.speed}MHz, ${usage}% used`);
    }

    if (os.platform() !== "win32") {
      const load = os.loadavg();
      lines.push(``);
      lines.push(`Load average: ${load.map((l) => l.toFixed(2)).join(", ")} (1m, 5m, 15m)`);
    }

    return { toolCallId: "", output: lines.join("\n"), isError: false };
  }

  private actionMemory(): ToolResult {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

    const lines = [
      `Memory`,
      ``,
      `Total:     ${formatBytes(totalMem)}`,
      `Used:      ${formatBytes(usedMem)} (${memPercent}%)`,
      `Free:      ${formatBytes(freeMem)}`,
    ];

    // Process memory
    const procMem = process.memoryUsage();
    lines.push(``);
    lines.push(`Node.js process memory:`);
    lines.push(`  RSS:        ${formatBytes(procMem.rss)}`);
    lines.push(`  Heap used:  ${formatBytes(procMem.heapUsed)}`);
    lines.push(`  Heap total: ${formatBytes(procMem.heapTotal)}`);

    return { toolCallId: "", output: lines.join("\n"), isError: false };
  }

  private async actionDisk(): Promise<ToolResult> {
    const isWindows = process.platform === "win32";

    if (isWindows) {
      const output = await runCommand("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Get-PSDrive -PSProvider FileSystem | Select-Object Name, ` +
          `@{N='Used(GB)';E={[math]::Round($_.Used/1GB,1)}}, ` +
          `@{N='Free(GB)';E={[math]::Round($_.Free/1GB,1)}}, ` +
          `@{N='Total(GB)';E={[math]::Round(($_.Used+$_.Free)/1GB,1)}}, ` +
          `Root | Format-Table -AutoSize`,
      ]);
      return {
        toolCallId: "",
        output: output || "Could not retrieve disk info.",
        isError: !output,
      };
    }

    const isMac = process.platform === "darwin";
    const dfArgs = isMac
      ? ["-h"]
      : ["-h", "--type=ext4", "--type=xfs", "--type=btrfs", "--type=apfs", "--type=hfs"];

    let output = await runCommand("df", dfArgs);
    if (!output && !isMac) {
      output = await runCommand("df", ["-h"]);
    }

    return {
      toolCallId: "",
      output: output || "Could not retrieve disk info.",
      isError: !output,
    };
  }

  private actionUptime(): ToolResult {
    const uptime = os.uptime();
    const bootTime = new Date(Date.now() - uptime * 1000);

    const lines = [`Uptime: ${formatUptime(uptime)}`, `Boot time: ${bootTime.toISOString()}`];

    return { toolCallId: "", output: lines.join("\n"), isError: false };
  }

  private async actionProcesses(count: number): Promise<ToolResult> {
    const isWindows = process.platform === "win32";

    if (isWindows) {
      const output = await runCommand("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Get-Process | Sort-Object CPU -Descending | Select-Object -First ${count} ` +
          `Id, ProcessName, ` +
          `@{N='CPU(s)';E={[math]::Round($_.CPU,1)}}, ` +
          `@{N='Mem(MB)';E={[math]::Round($_.WorkingSet64/1MB,1)}} ` +
          `| Format-Table -AutoSize`,
      ]);
      return {
        toolCallId: "",
        output: output
          ? `Top ${count} processes by CPU:\n\n${output}`
          : "Could not retrieve process list.",
        isError: !output,
      };
    }

    const isMac = process.platform === "darwin";
    const psArgs = isMac ? ["aux", "-r"] : ["aux", "--sort=-%cpu"];
    const output = await runCommand("ps", psArgs);

    if (!output) {
      return { toolCallId: "", output: "Could not retrieve process list.", isError: true };
    }

    const lines = output.split("\n");
    const header = lines[0] || "";
    const processes = lines.slice(1, count + 1);

    return {
      toolCallId: "",
      output: `Top ${count} processes by CPU:\n\n${header}\n${processes.join("\n")}`,
      isError: false,
    };
  }
}
