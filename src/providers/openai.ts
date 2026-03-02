import OpenAI from "openai";
import { logger } from "../shared/logger";

const SYSTEM_PROMPT =
  "You are TxtCode AI — a helpful, knowledgeable coding assistant accessible via messaging. Be concise, use markdown for clarity, and suggest /code mode for deep coding work.";

export async function processWithOpenAI(
  instruction: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const startTime = Date.now();
  logger.debug(`[OpenAI] Request → model=${model}, prompt=${instruction.length} chars`);

  try {
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: instruction },
      ],
    });

    const choice = completion.choices[0];

    logger.debug(
      `[OpenAI] Done in ${Date.now() - startTime}ms, ` +
        `tokens=${completion.usage?.prompt_tokens ?? "?"}in/${completion.usage?.completion_tokens ?? "?"}out`,
    );

    return choice.message.content || "No response from GPT";
  } catch (error: unknown) {
    logger.error(`[OpenAI] API error after ${Date.now() - startTime}ms`, error);
    throw new Error(
      `OpenAI API error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error },
    );
  }
}
