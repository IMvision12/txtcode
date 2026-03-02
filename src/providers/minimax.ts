import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../shared/logger";

const MINIMAX_BASE_URL = "https://api.minimax.chat/v1";

function loadSystemPrompt(): string {
  try {
    const promptPath = path.join(__dirname, "..", "data", "primary_llm_system_prompt.txt");
    return fs.readFileSync(promptPath, "utf-8");
  } catch {
    return "You are a helpful coding assistant.";
  }
}

export async function processWithMiniMax(
  instruction: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const startTime = Date.now();
  logger.debug(`[MiniMax] Request → model=${model}, prompt=${instruction.length} chars`);

  try {
    const client = new Anthropic({
      apiKey,
      baseURL: MINIMAX_BASE_URL,
    });

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: loadSystemPrompt(),
      messages: [{ role: "user", content: instruction }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    logger.debug(
      `[MiniMax] Done in ${Date.now() - startTime}ms, ` +
        `tokens=${response.usage.input_tokens}in/${response.usage.output_tokens}out`,
    );

    return text || "No response from MiniMax";
  } catch (error: unknown) {
    logger.error(`[MiniMax] API error after ${Date.now() - startTime}ms`, error);
    throw new Error(
      `MiniMax API error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error },
    );
  }
}
