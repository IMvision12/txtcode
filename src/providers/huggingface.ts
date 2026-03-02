import OpenAI from "openai";
import { logger } from "../shared/logger";

const HUGGINGFACE_BASE_URL = "https://router.huggingface.co/v1";

const SYSTEM_PROMPT =
  "You are TxtCode AI — a helpful, knowledgeable coding assistant accessible via messaging. Be concise, use markdown for clarity, and suggest /code mode for deep coding work.";

export async function processWithHuggingFace(
  instruction: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const startTime = Date.now();
  logger.debug(`[HuggingFace] Request → model=${model}, prompt=${instruction.length} chars`);

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: HUGGINGFACE_BASE_URL,
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
      `[HuggingFace] Done in ${Date.now() - startTime}ms, ` +
        `tokens=${completion.usage?.prompt_tokens ?? "?"}in/${completion.usage?.completion_tokens ?? "?"}out`,
    );

    return choice.message.content || "No response from HuggingFace";
  } catch (error: unknown) {
    logger.error(`[HuggingFace] API error after ${Date.now() - startTime}ms`, error);
    throw new Error(
      `HuggingFace API error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error },
    );
  }
}
