import { Tool, ToolCall, ToolDefinition, ToolResult, ParameterProperty } from "./types";

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.getDefinition());
  }

  getDefinitionsForProvider(provider: string): (Record<string, unknown> | ToolDefinition)[] {
    const defs = this.getDefinitions();

    switch (provider) {
      case "anthropic":
        return defs.map((d) => ({
          name: d.name,
          description: d.description,
          input_schema: toJsonSchema(d.parameters),
        }));

      case "openai":
        return defs.map((d) => ({
          type: "function",
          function: {
            name: d.name,
            description: d.description,
            parameters: toJsonSchema(d.parameters),
          },
        }));

      case "gemini":
        return [
          {
            functionDeclarations: defs.map((d) => ({
              name: d.name,
              description: d.description,
              parameters: toGeminiSchema(d.parameters),
            })),
          },
        ];

      default:
        return defs;
    }
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { toolCallId: "", output: `Unknown tool: ${name}`, isError: true };
    }

    if (signal?.aborted) {
      return { toolCallId: "", output: "Tool execution aborted", isError: true };
    }

    return tool.execute(args, signal);
  }

  async executeAll(calls: ToolCall[], signal?: AbortSignal): Promise<ToolResult[]> {
    const promises = calls.map(async (call) => {
      if (signal?.aborted) {
        return { toolCallId: call.id, output: "Tool execution aborted", isError: true } as ToolResult;
      }

      const result = await this.execute(call.name, call.arguments, signal);
      result.toolCallId = call.id;
      return result;
    });

    return Promise.all(promises);
  }
}

function toJsonSchema(params: ToolDefinition["parameters"]): Record<string, unknown> {
  return {
    type: "object",
    properties: Object.fromEntries(
      Object.entries(params.properties).map(([key, prop]) => [key, propertyToJsonSchema(prop)]),
    ),
    required: params.required,
  };
}

function propertyToJsonSchema(prop: ParameterProperty): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: prop.type,
    description: prop.description,
  };
  if (prop.enum) {
    schema.enum = prop.enum;
  }
  if (prop.items) {
    schema.items = { type: prop.items.type };
  }
  if (prop.properties) {
    schema.properties = Object.fromEntries(
      Object.entries(prop.properties).map(([k, v]) => [k, propertyToJsonSchema(v)]),
    );
    if (prop.required) {
      schema.required = prop.required;
    }
  }
  if (prop.default !== undefined) {
    schema.default = prop.default;
  }
  return schema;
}

function toGeminiSchema(params: ToolDefinition["parameters"]): Record<string, unknown> {
  return {
    type: "OBJECT",
    properties: Object.fromEntries(
      Object.entries(params.properties).map(([key, prop]) => [key, propertyToGeminiSchema(prop)]),
    ),
    required: params.required,
  };
}

function propertyToGeminiSchema(prop: ParameterProperty): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: prop.type.toUpperCase(),
    description: prop.description,
  };
  if (prop.enum) {
    schema.enum = prop.enum;
  }
  if (prop.items) {
    schema.items = { type: prop.items.type.toUpperCase() };
  }
  if (prop.properties) {
    schema.properties = Object.fromEntries(
      Object.entries(prop.properties).map(([k, v]) => [k, propertyToGeminiSchema(v)]),
    );
    if (prop.required) {
      schema.required = prop.required;
    }
  }
  return schema;
}
