import { Tool, ToolDefinition, ToolResult } from "./types";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_BODY_SIZE = 50_000;

const BLOCKED_HOSTS = new Set([
  "169.254.169.254", // AWS/GCP/Azure metadata
  "metadata.google.internal",
  "metadata.internal",
]);

export class HttpTool implements Tool {
  name = "http";
  description =
    "Make HTTP requests to test APIs, check endpoints, or fetch data. " +
    "Supports GET, POST, PUT, DELETE, PATCH, HEAD methods. " +
    "Response body is truncated to 50KB. Cloud metadata endpoints are blocked for security.";

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The URL to request (e.g. http://localhost:3000/api/users).",
          },
          method: {
            type: "string",
            description: "HTTP method.",
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
          },
          headers: {
            type: "object",
            description: "Request headers as key-value pairs (e.g. {\"Authorization\": \"Bearer ...\", \"Content-Type\": \"application/json\"}).",
          },
          body: {
            type: "string",
            description: "Request body (for POST/PUT/PATCH). Send as string — use JSON.stringify for JSON payloads.",
          },
          timeout: {
            type: "number",
            description: `Timeout in milliseconds (default ${DEFAULT_TIMEOUT_MS}).`,
          },
        },
        required: ["url"],
      },
    };
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult> {
    if (signal?.aborted) {
      return { toolCallId: "", output: "HTTP request aborted", isError: true };
    }

    const url = (args.url as string)?.trim();
    if (!url) {
      return { toolCallId: "", output: "Error: url is required.", isError: true };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { toolCallId: "", output: `Error: invalid URL: ${url}`, isError: true };
    }

    if (BLOCKED_HOSTS.has(parsedUrl.hostname)) {
      return { toolCallId: "", output: `Blocked: requests to ${parsedUrl.hostname} are not allowed (cloud metadata security).`, isError: true };
    }

    const method = ((args.method as string) || "GET").toUpperCase();
    const headers = (args.headers as Record<string, string>) || {};
    const body = args.body as string | undefined;
    const timeoutMs = typeof args.timeout === "number" ? args.timeout : DEFAULT_TIMEOUT_MS;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (signal) {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    try {
      const startTime = Date.now();

      const fetchOpts: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body && !["GET", "HEAD", "OPTIONS"].includes(method)) {
        fetchOpts.body = body;
      }

      const response = await fetch(url, fetchOpts);
      const elapsed = Date.now() - startTime;

      const responseHeaders: Record<string, string> = {};
      const importantHeaders = ["content-type", "content-length", "server", "x-request-id", "location", "set-cookie", "cache-control"];
      for (const key of importantHeaders) {
        const val = response.headers.get(key);
        if (val) {responseHeaders[key] = val;}
      }

      let responseBody = "";
      if (method !== "HEAD") {
        try {
          const text = await response.text();
          responseBody = text.length > MAX_BODY_SIZE
            ? text.substring(0, MAX_BODY_SIZE) + "\n\n(body truncated)"
            : text;
        } catch {
          responseBody = "(could not read response body)";
        }
      }

      const headerLines = Object.entries(responseHeaders)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n");

      const output = [
        `${response.status} ${response.statusText} (${elapsed}ms)`,
        headerLines ? `\nHeaders:\n${headerLines}` : "",
        responseBody ? `\nBody:\n${responseBody}` : "",
      ].filter(Boolean).join("\n");

      return {
        toolCallId: "",
        output,
        isError: response.status >= 400,
        metadata: {
          status: response.status,
          statusText: response.statusText,
          elapsed,
          method,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("abort")) {
        return { toolCallId: "", output: `Request timed out after ${timeoutMs}ms.`, isError: true };
      }
      return { toolCallId: "", output: `HTTP request failed: ${message}`, isError: true };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
