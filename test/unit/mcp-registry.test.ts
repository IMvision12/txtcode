import { describe, it, expect, beforeEach, vi } from "vitest";
import { ToolRegistry } from "../../src/tools/registry";
import type { Tool, ToolDefinition, ToolResult } from "../../src/tools/types";

function makeFakeTool(name: string): Tool {
  return {
    name,
    description: `Tool: ${name}`,
    getDefinition(): ToolDefinition {
      return {
        name,
        description: `Tool: ${name}`,
        parameters: {
          type: "object",
          properties: {
            input: { type: "string", description: "Input" },
          },
          required: ["input"],
        },
      };
    },
    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      return { toolCallId: "", output: `executed ${name}`, isError: false };
    },
  };
}

describe("ToolRegistry MCP methods", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe("registerMCPTools", () => {
    it("registers multiple MCP tools at once", () => {
      const tools = [makeFakeTool("github_create_issue"), makeFakeTool("github_list_repos")];

      registry.registerMCPTools(tools);
      expect(registry.getMCPToolCount()).toBe(2);

      const defs = registry.getDefinitions();
      expect(defs.map((d) => d.name)).toContain("github_create_issue");
      expect(defs.map((d) => d.name)).toContain("github_list_repos");
    });

    it("MCP tools are executable via execute()", async () => {
      registry.registerMCPTools([makeFakeTool("brave_web_search")]);

      const result = await registry.execute("brave_web_search", { input: "test" });
      expect(result.output).toBe("executed brave_web_search");
      expect(result.isError).toBe(false);
    });

    it("MCP tools coexist with built-in tools", () => {
      registry.register(makeFakeTool("terminal"));
      registry.register(makeFakeTool("git"));
      registry.registerMCPTools([
        makeFakeTool("github_create_issue"),
        makeFakeTool("brave_web_search"),
      ]);

      const defs = registry.getDefinitions();
      expect(defs).toHaveLength(4);
      expect(registry.getMCPToolCount()).toBe(2);
    });
  });

  describe("removeMCPTools", () => {
    it("removes tools matching the prefix", () => {
      registry.registerMCPTools([
        makeFakeTool("github_create_issue"),
        makeFakeTool("github_list_repos"),
        makeFakeTool("brave_web_search"),
      ]);

      registry.removeMCPTools("github");
      expect(registry.getMCPToolCount()).toBe(1);

      const defs = registry.getDefinitions();
      expect(defs.map((d) => d.name)).toEqual(["brave_web_search"]);
    });

    it("does not affect built-in tools", () => {
      registry.register(makeFakeTool("git"));
      registry.registerMCPTools([makeFakeTool("github_create_issue")]);

      registry.removeMCPTools("github");

      const defs = registry.getDefinitions();
      expect(defs.map((d) => d.name)).toEqual(["git"]);
      expect(registry.getMCPToolCount()).toBe(0);
    });

    it("no-ops when prefix matches nothing", () => {
      registry.registerMCPTools([makeFakeTool("github_create_issue")]);
      registry.removeMCPTools("nonexistent");
      expect(registry.getMCPToolCount()).toBe(1);
    });
  });

  describe("getMCPToolCount", () => {
    it("returns 0 when no MCP tools registered", () => {
      registry.register(makeFakeTool("terminal"));
      expect(registry.getMCPToolCount()).toBe(0);
    });
  });

  describe("MCP tools in provider-specific formats", () => {
    beforeEach(() => {
      registry.registerMCPTools([makeFakeTool("github_create_issue")]);
    });

    it("formats MCP tools for Anthropic", () => {
      const defs = registry.getDefinitionsForProvider("anthropic");
      expect(defs).toHaveLength(1);
      const def = defs[0] as Record<string, unknown>;
      expect(def.name).toBe("github_create_issue");
      expect(def.input_schema).toBeDefined();
    });

    it("formats MCP tools for OpenAI", () => {
      const defs = registry.getDefinitionsForProvider("openai");
      expect(defs).toHaveLength(1);
      const def = defs[0] as Record<string, unknown>;
      expect(def.type).toBe("function");
      const fn = def.function as Record<string, unknown>;
      expect(fn.name).toBe("github_create_issue");
      expect(fn.parameters).toBeDefined();
    });

    it("formats MCP tools for Gemini", () => {
      const defs = registry.getDefinitionsForProvider("gemini");
      expect(defs).toHaveLength(1);
      const wrapper = defs[0] as Record<string, unknown>;
      const declarations = wrapper.functionDeclarations as Array<Record<string, unknown>>;
      expect(declarations).toHaveLength(1);
      expect(declarations[0].name).toBe("github_create_issue");
    });
  });
});
