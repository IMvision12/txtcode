export type ParameterType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface ParameterProperty {
  type: ParameterType;
  description: string;
  enum?: string[];
  items?: { type: ParameterType };
  properties?: Record<string, ParameterProperty>;
  required?: string[];
  default?: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ParameterProperty>;
    required: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  output: string;
  isError: boolean;
  metadata?: Record<string, unknown>;
}

export interface Tool {
  name: string;
  description: string;
  getDefinition(): ToolDefinition;
  execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult>;
}
