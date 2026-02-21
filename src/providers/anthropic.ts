import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { ToolRegistry } from "../tools/registry";

const MAX_ITERATIONS = 10;

function loadSystemPrompt(): string {
  try {
    const promptPath = path.join(__dirname, "..", "data", "primary_llm_system_prompt.txt");
    return fs.readFileSync(promptPath, "utf-8");
  } catch {
    return "You are a helpful coding assistant.";
  }
}

export async function processWithAnthropic(
  instruction: string,
  apiKey: string,
  model: string,
  toolRegistry?: ToolRegistry,
): Promise<string> {
  try {
    const anthropic = new Anthropic({ apiKey });

    const tools = toolRegistry ? toolRegistry.getDefinitionsForProvider("anthropic") : undefined;

    const messages: any[] = [{ role: "user", content: instruction }];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: loadSystemPrompt(),
        messages,
        ...(tools ? { tools } : {}),
      });

      const textParts = response.content
        .filter((block: any) => block.type === "text")
        .map((block: any) => block.text);

      const toolCalls = response.content.filter((block: any) => block.type === "tool_use");

      if (toolCalls.length === 0 || !toolRegistry) {
        return textParts.join("\n") || "No response from Claude";
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: any[] = [];
      for (const call of toolCalls) {
        const toolUse = call as any;
        const result = await toolRegistry.execute(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result.output,
        });
      }

      messages.push({ role: "user", content: toolResults });
    }

    return "Reached maximum tool iterations.";
  } catch (error) {
    throw new Error(
      `Anthropic API error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error },
    );
  }
}
