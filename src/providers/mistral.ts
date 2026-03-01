import fs from "fs";
import path from "path";
import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions/completions";
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

export async function processWithMistral(
  instruction: string,
  apiKey: string,
  model: string,
  toolRegistry?: ToolRegistry,
): Promise<string> {
  const startTime = Date.now();
  logger.debug(`[Mistral] Request → model=${model}, prompt=${instruction.length} chars`);

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.mistral.ai/v1",
    });

    const tools = toolRegistry
      ? (toolRegistry.getDefinitionsForProvider("openai") as unknown as ChatCompletionTool[])
      : undefined;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: loadSystemPrompt() },
      { role: "user", content: instruction },
    ];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const iterStart = Date.now();
      const completion = await client.chat.completions.create({
        model,
        messages,
        max_tokens: 4096,
        ...(tools ? { tools } : {}),
      });

      const choice = completion.choices[0];
      const assistantMsg = choice.message;

      logger.debug(
        `[Mistral] Response ← iteration=${i + 1}, finish=${choice.finish_reason}, ` +
          `tokens=${completion.usage?.prompt_tokens ?? "?"}in/${completion.usage?.completion_tokens ?? "?"}out, ` +
          `time=${Date.now() - iterStart}ms`,
      );

      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0 || !toolRegistry) {
        logger.debug(`[Mistral] Done in ${Date.now() - startTime}ms (${i + 1} iteration(s))`);
        return assistantMsg.content || "No response from Mistral AI";
      }

      logger.debug(
        `[Mistral] Tool calls: ${assistantMsg.tool_calls.map((t) => ("function" in t ? t.function.name : t.type)).join(", ")}`,
      );

      messages.push(assistantMsg);

      for (const toolCall of assistantMsg.tool_calls) {
        if (toolCall.type !== "function") {
          continue;
        }
        const args = JSON.parse(toolCall.function.arguments);
        const result = await toolRegistry.execute(toolCall.function.name, args);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result.output,
        });
      }
    }

    logger.warn(`[Mistral] Reached max ${MAX_ITERATIONS} iterations`);
    return "Reached maximum tool iterations.";
  } catch (error: unknown) {
    logger.error(`[Mistral] API error after ${Date.now() - startTime}ms`, error);
    throw new Error(
      `Mistral AI API error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error },
    );
  }
}
