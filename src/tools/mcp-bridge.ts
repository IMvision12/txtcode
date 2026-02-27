import { logger } from "../shared/logger";
import { Client, StdioClientTransport, StreamableHTTPClientTransport } from "./mcp-sdk";
import { Tool, ToolDefinition, ToolResult, ParameterProperty, ParameterType } from "./types";

interface MCPTransport {
  start(): Promise<void>;
  close(): Promise<void>;
  send(message: unknown): Promise<void>;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: unknown) => void;
}

interface MCPToolSchema {
  inputSchema: {
    type: "object";
    properties?: Record<string, object>;
    required?: string[];
    [key: string]: unknown;
  };
  name: string;
  description?: string;
}

interface MCPClient {
  connect(transport: MCPTransport): Promise<void>;
  listTools(): Promise<{ tools: MCPToolSchema[] }>;
  callTool(params: { name: string; arguments: Record<string, unknown> }): Promise<{
    content: Array<{ type: string; text?: string }>;
    isError?: boolean;
  }>;
  close(): Promise<void>;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

interface MCPConnection {
  client: MCPClient;
  transport: MCPTransport;
  tools: MCPToolAdapter[];
  config: MCPServerConfig;
}

export class MCPBridge {
  private connections: Map<string, MCPConnection> = new Map();

  async connect(config: MCPServerConfig): Promise<MCPToolAdapter[]> {
    if (this.connections.has(config.id)) {
      logger.debug(`MCP server "${config.id}" is already connected`);
      return this.connections.get(config.id)!.tools;
    }

    const client: MCPClient = new Client(
      { name: "txtcode", version: "0.1.0" },
      { capabilities: {} },
    );

    let transport: MCPTransport;

    if (config.transport === "stdio") {
      if (!config.command) {
        throw new Error(`MCP server "${config.id}" requires a command for stdio transport`);
      }

      transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: { ...process.env, ...config.env } as Record<string, string>,
        stderr: "pipe",
      });
    } else {
      if (!config.url) {
        throw new Error(`MCP server "${config.id}" requires a URL for HTTP transport`);
      }

      const requestInit: RequestInit = {};
      if (config.headers) {
        requestInit.headers = config.headers;
      }

      transport = new StreamableHTTPClientTransport(new URL(config.url), { requestInit });
    }

    await client.connect(transport);

    const toolsResult = await client.listTools();
    const tools: MCPToolAdapter[] = toolsResult.tools.map(
      (mcpTool) => new MCPToolAdapter(config.id, mcpTool, client),
    );

    this.connections.set(config.id, { client, transport, tools, config });

    logger.debug(`MCP server "${config.name}" connected: ${tools.length} tool(s) discovered`);

    return tools;
  }

  getTools(): MCPToolAdapter[] {
    const allTools: MCPToolAdapter[] = [];
    for (const conn of this.connections.values()) {
      allTools.push(...conn.tools);
    }
    return allTools;
  }

  getToolsForServer(serverId: string): MCPToolAdapter[] {
    return this.connections.get(serverId)?.tools ?? [];
  }

  getConnectedServerIds(): string[] {
    return Array.from(this.connections.keys());
  }

  async disconnect(serverId: string): Promise<void> {
    const conn = this.connections.get(serverId);
    if (!conn) {
      return;
    }

    try {
      await conn.transport.close();
    } catch (error) {
      logger.debug(`Error disconnecting MCP server "${serverId}": ${error}`);
    }

    this.connections.delete(serverId);
    logger.debug(`MCP server "${serverId}" disconnected`);
  }

  async disconnectAll(): Promise<void> {
    const ids = Array.from(this.connections.keys());
    await Promise.allSettled(ids.map((id) => this.disconnect(id)));
  }
}

export class MCPToolAdapter implements Tool {
  name: string;
  description: string;
  private serverId: string;
  private mcpTool: MCPToolSchema;
  private client: MCPClient;

  constructor(serverId: string, mcpTool: MCPToolSchema, client: MCPClient) {
    this.serverId = serverId;
    this.mcpTool = mcpTool;
    this.name = `${serverId}_${mcpTool.name}`;
    this.description = mcpTool.description || `MCP tool from ${serverId}`;
    this.client = client;
  }

  getDefinition(): ToolDefinition {
    const mcpProps = this.mcpTool.inputSchema.properties || {};
    const mcpRequired = this.mcpTool.inputSchema.required || [];

    const properties: Record<string, ParameterProperty> = {};
    for (const [key, schema] of Object.entries(mcpProps)) {
      properties[key] = convertMCPSchemaToProperty(schema as Record<string, unknown>);
    }

    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties,
        required: mcpRequired,
      },
    };
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult> {
    if (signal?.aborted) {
      return { toolCallId: "", output: "MCP tool execution aborted", isError: true };
    }

    try {
      const result = await this.client.callTool({
        name: this.mcpTool.name,
        arguments: args,
      });

      const content = result.content as Array<{ type: string; text?: string }>;
      const output = content
        .map((item) => {
          if (item.type === "text" && item.text) {
            return item.text;
          }
          return JSON.stringify(item);
        })
        .join("\n");

      return {
        toolCallId: "",
        output: output || "(no output)",
        isError: result.isError === true,
        metadata: { mcpServer: this.serverId, mcpTool: this.mcpTool.name },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        toolCallId: "",
        output: `MCP tool error (${this.serverId}/${this.mcpTool.name}): ${message}`,
        isError: true,
        metadata: { mcpServer: this.serverId, mcpTool: this.mcpTool.name },
      };
    }
  }
}

const TYPE_MAP: Record<string, ParameterType> = {
  string: "string",
  number: "number",
  integer: "number",
  boolean: "boolean",
  object: "object",
  array: "array",
};

function convertMCPSchemaToProperty(schema: Record<string, unknown>): ParameterProperty {
  const type = TYPE_MAP[String(schema.type || "string")] || "string";
  const prop: ParameterProperty = {
    type,
    description: (schema.description as string) || "",
  };

  if (schema.enum) {
    prop.enum = schema.enum as string[];
  }

  if (schema.items && type === "array") {
    const items = schema.items as Record<string, unknown>;
    prop.items = { type: TYPE_MAP[String(items.type || "string")] || "string" };
  }

  if (schema.properties && type === "object") {
    const nested: Record<string, ParameterProperty> = {};
    for (const [k, v] of Object.entries(schema.properties as Record<string, unknown>)) {
      nested[k] = convertMCPSchemaToProperty(v as Record<string, unknown>);
    }
    prop.properties = nested;
    if (schema.required) {
      prop.required = schema.required as string[];
    }
  }

  if (schema.default !== undefined) {
    prop.default = schema.default;
  }

  return prop;
}
