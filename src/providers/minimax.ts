import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../shared/logger";

const MINIMAX_BASE_URL = "https://api.minimax.chat/v1";

const SYSTEM_PROMPT =
  "You are TxtCode AI — a helpful, knowledgeable coding assistant accessible via messaging. Be concise, use markdown for clarity, and suggest /code mode for deep coding work.";

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
      system: SYSTEM_PROMPT,
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
