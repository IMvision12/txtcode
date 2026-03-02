import OpenAI from "openai";
import { logger } from "../shared/logger";

const SYSTEM_PROMPT =
  "You are TxtCode AI — a helpful, knowledgeable coding assistant accessible via messaging. Be concise, use markdown for clarity, and suggest /code mode for deep coding work.";

export async function processWithXAI(
  instruction: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const startTime = Date.now();
  logger.debug(`[xAI] Request → model=${model}, prompt=${instruction.length} chars`);

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.x.ai/v1",
    });

    const completion = await client.chat.completions.create({
      model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: instruction },
      ],
    });

    const choice = completion.choices[0];

    logger.debug(
      `[xAI] Done in ${Date.now() - startTime}ms, ` +
        `tokens=${completion.usage?.prompt_tokens ?? "?"}in/${completion.usage?.completion_tokens ?? "?"}out`,
    );

    return choice.message.content || "No response from xAI";
  } catch (error: unknown) {
    logger.error(`[xAI] API error after ${Date.now() - startTime}ms`, error);
    throw new Error(`xAI API error: ${error instanceof Error ? error.message : "Unknown error"}`, {
      cause: error,
    });
  }
}
