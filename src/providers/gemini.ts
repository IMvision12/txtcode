import fs from "fs";
import path from "path";
import {
  type FunctionResponsePart,
  type Tool as GeminiTool,
  GoogleGenerativeAI,
} from "@google/generative-ai";
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

export async function processWithGemini(
  instruction: string,
  apiKey: string,
  model: string,
  toolRegistry?: ToolRegistry,
): Promise<string> {
  const startTime = Date.now();
  logger.debug(`[Gemini] Request → model=${model}, prompt=${instruction.length} chars`);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const tools = toolRegistry
      ? (toolRegistry.getDefinitionsForProvider("gemini") as unknown as GeminiTool[])
      : undefined;

    const genModel = genAI.getGenerativeModel({
      model,
      systemInstruction: loadSystemPrompt(),
      ...(tools ? { tools } : {}),
    });

    const chat = genModel.startChat();
    let iterStart = Date.now();
    let result = await chat.sendMessage(instruction);

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = result.response;
      const calls = response.functionCalls();

      logger.debug(
        `[Gemini] Response ← iteration=${i + 1}, ` +
          `toolCalls=${calls?.length ?? 0}, ` +
          `time=${Date.now() - iterStart}ms`,
      );

      if (!calls || calls.length === 0 || !toolRegistry) {
        logger.debug(`[Gemini] Done in ${Date.now() - startTime}ms (${i + 1} iteration(s))`);
        return response.text();
      }

      logger.debug(
        `[Gemini] Tool calls: ${calls.map((c) => c.name).join(", ")}`,
      );

      const toolResults: FunctionResponsePart[] = [];
      for (const call of calls) {
        const execResult = await toolRegistry.execute(
          call.name,
          (call.args || {}) as Record<string, unknown>,
        );
        toolResults.push({
          functionResponse: {
            name: call.name,
            response: { output: execResult.output, isError: execResult.isError },
          },
        });
      }

      iterStart = Date.now();
      result = await chat.sendMessage(toolResults);
    }

    logger.warn(`[Gemini] Reached max ${MAX_ITERATIONS} iterations`);
    return "Reached maximum tool iterations.";
  } catch (error: unknown) {
    logger.error(`[Gemini] API error after ${Date.now() - startTime}ms`, error);
    throw new Error(
      `Gemini API error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error },
    );
  }
}
