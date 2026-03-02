import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../shared/logger";

function loadSystemPrompt(): string {
  try {
    const promptPath = path.join(__dirname, "..", "data", "primary_llm_system_prompt.txt");
    return fs.readFileSync(promptPath, "utf-8");
  } catch {
    return "You are a helpful coding assistant.";
  }
}

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
      systemInstruction: loadSystemPrompt(),
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
