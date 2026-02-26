import { EventEmitter } from "events";
import { Readable } from "stream";

export interface FakeProcessOptions {
  stdout?: string[];
  stderr?: string[];
  exitCode?: number;
  exitSignal?: string | null;
  error?: Error;
  delayMs?: number;
}

export class FakeChildProcess extends EventEmitter {
  pid = 12345;
  stdout: Readable;
  stderr: Readable;
  killed = false;

  private options: FakeProcessOptions;

  constructor(options: FakeProcessOptions = {}) {
    super();
    this.options = options;
    this.stdout = new Readable({ read() {} });
    this.stderr = new Readable({ read() {} });
  }

  kill(signal?: string): boolean {
    this.killed = true;
    if (signal === "SIGTERM") {
      setImmediate(() => this.emit("exit", null, "SIGTERM"));
    }
    return true;
  }

  async run(): Promise<void> {
    const delay = this.options.delayMs || 5;
    await sleep(delay);

    if (this.options.error) {
      this.emit("error", this.options.error);
      return;
    }

    for (const chunk of this.options.stdout || []) {
      this.stdout.push(Buffer.from(chunk));
    }

    for (const chunk of this.options.stderr || []) {
      this.stderr.push(Buffer.from(chunk));
    }

    this.emit("exit", this.options.exitCode ?? 0, this.options.exitSignal ?? null);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
