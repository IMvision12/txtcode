import fs from "fs";
import path from "path";
import {
  type FunctionResponsePart,
  type Tool as GeminiTool,
  GoogleGenerativeAI,
} from "@google/generative-ai";
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
    let result = await chat.sendMessage(instruction);

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = result.response;
      const calls = response.functionCalls();

      if (!calls || calls.length === 0 || !toolRegistry) {
        return response.text();
      }

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

      result = await chat.sendMessage(toolResults);
    }

    return "Reached maximum tool iterations.";
  } catch (error: unknown) {
    throw new Error(
      `Gemini API error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error },
    );
  }
}
