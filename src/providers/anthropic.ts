import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../shared/logger";

const SYSTEM_PROMPT =
  "You are TxtCode AI — a helpful, knowledgeable coding assistant accessible via messaging. Be concise, use markdown for clarity, and suggest /code mode for deep coding work.";

export async function processWithAnthropic(
  instruction: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const startTime = Date.now();
  logger.debug(`[Anthropic] Request → model=${model}, prompt=${instruction.length} chars`);

  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
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
      `[Anthropic] Done in ${Date.now() - startTime}ms, ` +
        `tokens=${response.usage.input_tokens}in/${response.usage.output_tokens}out`,
    );

    return text || "No response from Claude";
  } catch (error: unknown) {
    logger.error(`[Anthropic] API error after ${Date.now() - startTime}ms`, error);
    throw new Error(
      `Anthropic API error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error },
    );
  }
}
