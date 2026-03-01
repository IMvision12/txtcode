import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import type {
  ContentBlock,
  MessageParam,
  TextBlock,
  ToolResultBlockParam,
  ToolUnion,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages/messages";
import { logger } from "../shared/logger";
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
  const startTime = Date.now();
  logger.debug(`[Anthropic] Request → model=${model}, prompt=${instruction.length} chars`);

  try {
    const anthropic = new Anthropic({ apiKey });

    const tools = toolRegistry
      ? (toolRegistry.getDefinitionsForProvider("anthropic") as unknown as ToolUnion[])
      : undefined;

    const messages: MessageParam[] = [{ role: "user", content: instruction }];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const iterStart = Date.now();
      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: loadSystemPrompt(),
        messages,
        ...(tools ? { tools } : {}),
      });

      logger.debug(
        `[Anthropic] Response ← iteration=${i + 1}, stop=${response.stop_reason}, ` +
          `tokens=${response.usage.input_tokens}in/${response.usage.output_tokens}out, ` +
          `time=${Date.now() - iterStart}ms`,
      );

      const textParts = response.content
        .filter((block: ContentBlock): block is TextBlock => block.type === "text")
        .map((block: TextBlock) => block.text);

      const toolCalls = response.content.filter(
        (block: ContentBlock): block is ToolUseBlock => block.type === "tool_use",
      );

      if (toolCalls.length === 0 || !toolRegistry) {
        logger.debug(`[Anthropic] Done in ${Date.now() - startTime}ms (${i + 1} iteration(s))`);
        return textParts.join("\n") || "No response from Claude";
      }

      logger.debug(`[Anthropic] Tool calls: ${toolCalls.map((t) => t.name).join(", ")}`);

      messages.push({ role: "assistant", content: response.content });

      const toolResults: ToolResultBlockParam[] = [];
      for (const toolUse of toolCalls) {
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

    logger.warn(`[Anthropic] Reached max ${MAX_ITERATIONS} iterations`);
    return "Reached maximum tool iterations.";
  } catch (error: unknown) {
    logger.error(`[Anthropic] API error after ${Date.now() - startTime}ms`, error);
    throw new Error(
      `Anthropic API error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error },
    );
  }
}
