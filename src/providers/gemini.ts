import { GoogleGenerativeAI } from '@google/generative-ai';
import { ToolRegistry } from '../tools/registry';

const MAX_ITERATIONS = 10;

export async function processWithGemini(
  instruction: string,
  apiKey: string,
  model: string,
  toolRegistry?: ToolRegistry
): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const tools = toolRegistry
      ? toolRegistry.getDefinitionsForProvider('gemini')
      : undefined;

    const genModel = genAI.getGenerativeModel({
      model,
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

      const toolResults: any[] = [];
      for (const call of calls) {
        const execResult = await toolRegistry.execute(
          call.name,
          (call.args || {}) as Record<string, unknown>
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

    return 'Reached maximum tool iterations.';
  } catch (error) {
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
