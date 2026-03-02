import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { logger } from "../shared/logger";

function loadSystemPrompt(): string {
  try {
    const promptPath = path.join(__dirname, "..", "data", "primary_llm_system_prompt.txt");
    return fs.readFileSync(promptPath, "utf-8");
  } catch {
    return "You are a helpful coding assistant.";
  }
}

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
        { role: "system", content: loadSystemPrompt() },
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
