import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../shared/logger";

const SYSTEM_PROMPT =
  "You are TxtCode AI — a helpful, knowledgeable coding assistant accessible via messaging. Be concise, use markdown for clarity, and suggest /code mode for deep coding work.";

export async function processWithGemini(
  instruction: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const startTime = Date.now();
  logger.debug(`[Gemini] Request → model=${model}, prompt=${instruction.length} chars`);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const genModel = genAI.getGenerativeModel({
      model,
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await genModel.generateContent(instruction);
    const text = result.response.text();

    logger.debug(`[Gemini] Done in ${Date.now() - startTime}ms`);

    return text || "No response from Gemini";
  } catch (error: unknown) {
    logger.error(`[Gemini] API error after ${Date.now() - startTime}ms`, error);
    throw new Error(
      `Gemini API error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error },
    );
  }
}
