import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockConnect, mockListTools, mockCallTool, mockClose, mockTransportClose } = vi.hoisted(
  () => ({
    mockConnect: vi.fn(),
    mockListTools: vi.fn(),
    mockCallTool: vi.fn(),
    mockClose: vi.fn(),
    mockTransportClose: vi.fn(),
  }),
);

vi.mock("../../src/shared/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("../../src/tools/mcp-sdk", () => ({
  Client: class {
    connect = mockConnect;
    listTools = mockListTools;
    callTool = mockCallTool;
    close = mockClose;
  },
  StdioClientTransport: class {
    close = mockTransportClose;
    constructor(public params: unknown) {}
  },
  StreamableHTTPClientTransport: class {
    close = mockTransportClose;
    constructor(
      public url: URL,
      public opts?: unknown,
    ) {}
  },
}));

import { MCPBridge, MCPToolAdapter } from "../../src/tools/mcp-bridge";

describe("MCPBridge", () => {
  let bridge: MCPBridge;

  beforeEach(() => {
    vi.clearAllMocks();
    bridge = new MCPBridge();

    mockListTools.mockResolvedValue({
      tools: [
        {
          name: "create_issue",
          description: "Create a GitHub issue",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Issue title" },
              body: { type: "string", description: "Issue body" },
            },
            required: ["title"],
          },
        },
        {
          name: "list_repos",
          description: "List repositories",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
            },
            required: ["owner"],
          },
        },
      ],
    });
  });

  describe("connect", () => {
    it("connects to a stdio server and discovers tools", async () => {
      const tools = await bridge.connect({
        id: "github",
        name: "GitHub",
        transport: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
      });

      expect(mockConnect).toHaveBeenCalledOnce();
      expect(mockListTools).toHaveBeenCalledOnce();
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe("github_create_issue");
      expect(tools[1].name).toBe("github_list_repos");
    });

    it("connects to an HTTP server", async () => {
      const tools = await bridge.connect({
        id: "supabase",
        name: "Supabase",
        transport: "http",
        url: "https://mcp.supabase.com/mcp",
        headers: { Authorization: "Bearer test-token" },
      });

      expect(mockConnect).toHaveBeenCalledOnce();
      expect(tools).toHaveLength(2);
    });

    it("throws when stdio server has no command", async () => {
      await expect(
        bridge.connect({
          id: "bad",
          name: "Bad",
          transport: "stdio",
        }),
      ).rejects.toThrow("requires a command");
    });

    it("throws when HTTP server has no URL", async () => {
      await expect(
        bridge.connect({
          id: "bad",
          name: "Bad",
          transport: "http",
        }),
      ).rejects.toThrow("requires a URL");
    });

    it("returns existing tools if server is already connected", async () => {
      const first = await bridge.connect({
        id: "github",
        name: "GitHub",
        transport: "stdio",
        command: "npx",
      });

      const second = await bridge.connect({
        id: "github",
        name: "GitHub",
        transport: "stdio",
        command: "npx",
      });

      expect(mockConnect).toHaveBeenCalledOnce();
      expect(first).toBe(second);
    });
  });

  describe("getTools / getToolsForServer / getConnectedServerIds", () => {
    it("returns all tools across servers", async () => {
      await bridge.connect({
        id: "github",
        name: "GitHub",
        transport: "stdio",
        command: "npx",
      });

      mockListTools.mockResolvedValueOnce({
        tools: [
          {
            name: "web_search",
            description: "Search the web",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
        ],
      });

      await bridge.connect({
        id: "brave",
        name: "Brave Search",
        transport: "stdio",
        command: "npx",
      });

      expect(bridge.getTools()).toHaveLength(3);
      expect(bridge.getToolsForServer("github")).toHaveLength(2);
      expect(bridge.getToolsForServer("brave")).toHaveLength(1);
      expect(bridge.getConnectedServerIds()).toEqual(["github", "brave"]);
    });

    it("returns empty array for unknown server", () => {
      expect(bridge.getToolsForServer("nonexistent")).toEqual([]);
    });
  });

  describe("disconnect / disconnectAll", () => {
    it("disconnects a single server", async () => {
      await bridge.connect({
        id: "github",
        name: "GitHub",
        transport: "stdio",
        command: "npx",
      });

      await bridge.disconnect("github");
      expect(mockTransportClose).toHaveBeenCalledOnce();
      expect(bridge.getConnectedServerIds()).toEqual([]);
    });

    it("handles disconnect of unknown server gracefully", async () => {
      await bridge.disconnect("nonexistent");
      expect(mockTransportClose).not.toHaveBeenCalled();
    });

    it("disconnects all servers", async () => {
      await bridge.connect({
        id: "github",
        name: "GitHub",
        transport: "stdio",
        command: "npx",
      });

      mockListTools.mockResolvedValueOnce({ tools: [] });
      await bridge.connect({
        id: "brave",
        name: "Brave",
        transport: "stdio",
        command: "npx",
      });

      await bridge.disconnectAll();
      expect(mockTransportClose).toHaveBeenCalledTimes(2);
      expect(bridge.getConnectedServerIds()).toEqual([]);
    });
  });
});

describe("MCPToolAdapter", () => {
  const mockClient = {
    connect: vi.fn(),
    listTools: vi.fn(),
    callTool: vi.fn(),
    close: vi.fn(),
  };

  const sampleTool = {
    name: "create_issue",
    description: "Create a GitHub issue",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Issue title" },
        body: { type: "string", description: "Issue body" },
        labels: {
          type: "array",
          description: "Labels",
          items: { type: "string" },
        },
        metadata: {
          type: "object",
          description: "Extra metadata",
          properties: {
            priority: { type: "number", description: "Priority level" },
          },
          required: ["priority"],
        },
      },
      required: ["title"],
    },
  };

  let adapter: MCPToolAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new MCPToolAdapter("github", sampleTool, mockClient as never);
  });

  describe("name and description", () => {
    it("prefixes tool name with server ID", () => {
      expect(adapter.name).toBe("github_create_issue");
    });

    it("uses MCP tool description", () => {
      expect(adapter.description).toBe("Create a GitHub issue");
    });

    it("falls back to default description", () => {
      const noDesc = new MCPToolAdapter(
        "gh",
        { ...sampleTool, description: undefined },
        mockClient as never,
      );
      expect(noDesc.description).toBe("MCP tool from gh");
    });
  });

  describe("getDefinition", () => {
    it("produces valid ToolDefinition with correct name", () => {
      const def = adapter.getDefinition();
      expect(def.name).toBe("github_create_issue");
      expect(def.description).toBe("Create a GitHub issue");
      expect(def.parameters.type).toBe("object");
      expect(def.parameters.required).toEqual(["title"]);
    });

    it("converts string properties", () => {
      const def = adapter.getDefinition();
      expect(def.parameters.properties.title).toEqual({
        type: "string",
        description: "Issue title",
      });
    });

    it("converts array properties with items", () => {
      const def = adapter.getDefinition();
      expect(def.parameters.properties.labels).toEqual({
        type: "array",
        description: "Labels",
        items: { type: "string" },
      });
    });

    it("converts nested object properties", () => {
      const def = adapter.getDefinition();
      expect(def.parameters.properties.metadata.type).toBe("object");
      expect(def.parameters.properties.metadata.properties).toBeDefined();
      expect(def.parameters.properties.metadata.properties!.priority).toEqual({
        type: "number",
        description: "Priority level",
      });
      expect(def.parameters.properties.metadata.required).toEqual(["priority"]);
    });

    it("handles empty inputSchema properties", () => {
      const empty = new MCPToolAdapter(
        "test",
        {
          name: "noop",
          inputSchema: { type: "object" },
        },
        mockClient as never,
      );
      const def = empty.getDefinition();
      expect(def.parameters.properties).toEqual({});
      expect(def.parameters.required).toEqual([]);
    });
  });

  describe("execute", () => {
    it("calls MCP server and returns text output", async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: "text", text: "Issue #42 created" }],
        isError: false,
      });

      const result = await adapter.execute({ title: "Bug fix" });
      expect(mockClient.callTool).toHaveBeenCalledWith({
        name: "create_issue",
        arguments: { title: "Bug fix" },
      });
      expect(result.output).toBe("Issue #42 created");
      expect(result.isError).toBe(false);
      expect(result.metadata).toEqual({
        mcpServer: "github",
        mcpTool: "create_issue",
      });
    });

    it("joins multiple text content blocks", async () => {
      mockClient.callTool.mockResolvedValue({
        content: [
          { type: "text", text: "Line 1" },
          { type: "text", text: "Line 2" },
        ],
      });

      const result = await adapter.execute({});
      expect(result.output).toBe("Line 1\nLine 2");
    });

    it("JSON-stringifies non-text content", async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: "image", data: "base64data", mimeType: "image/png" }],
      });

      const result = await adapter.execute({});
      expect(result.output).toContain("image");
      expect(result.output).toContain("base64data");
    });

    it("returns (no output) for empty content", async () => {
      mockClient.callTool.mockResolvedValue({ content: [] });

      const result = await adapter.execute({});
      expect(result.output).toBe("(no output)");
    });

    it("returns isError=true when MCP reports error", async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: "text", text: "Not found" }],
        isError: true,
      });

      const result = await adapter.execute({});
      expect(result.isError).toBe(true);
      expect(result.output).toBe("Not found");
    });

    it("handles exceptions from callTool", async () => {
      mockClient.callTool.mockRejectedValue(new Error("Connection lost"));

      const result = await adapter.execute({});
      expect(result.isError).toBe(true);
      expect(result.output).toContain("Connection lost");
      expect(result.output).toContain("github/create_issue");
    });

    it("returns abort result when signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      const result = await adapter.execute({}, controller.signal);
      expect(result.isError).toBe(true);
      expect(result.output).toBe("MCP tool execution aborted");
      expect(mockClient.callTool).not.toHaveBeenCalled();
    });
  });
});
