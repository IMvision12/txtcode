import { Tool, ToolCall, ToolDefinition, ToolResult } from './types';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.getDefinition());
  }

  getDefinitionsForProvider(provider: string): any[] {
    const defs = this.getDefinitions();

    switch (provider) {
      case 'anthropic':
        return defs.map((d) => ({
          name: d.name,
          description: d.description,
          input_schema: d.parameters,
        }));

      case 'openai':
        return defs.map((d) => ({
          type: 'function',
          function: {
            name: d.name,
            description: d.description,
            parameters: d.parameters,
          },
        }));

      case 'gemini':
        return [{
          functionDeclarations: defs.map((d) => ({
            name: d.name,
            description: d.description,
            parameters: {
              type: 'OBJECT',
              properties: Object.fromEntries(
                Object.entries(d.parameters.properties).map(([key, val]) => [
                  key,
                  { type: val.type.toUpperCase(), description: val.description },
                ])
              ),
              required: d.parameters.required,
            },
          })),
        }];

      default:
        return defs;
    }
  }

  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { toolCallId: '', output: `Unknown tool: ${name}`, isError: true };
    }
    return tool.execute(args);
  }

  async executeAll(calls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    for (const call of calls) {
      const result = await this.execute(call.name, call.arguments);
      result.toolCallId = call.id;
      results.push(result);
    }
    return results;
  }
}
