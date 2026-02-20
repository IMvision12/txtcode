import OpenAI from 'openai';
import { ToolRegistry } from '../tools/registry';

const MAX_ITERATIONS = 10;

export async function processWithDeepSeek(
  instruction: string,
  apiKey: string,
  model: string,
  toolRegistry?: ToolRegistry
): Promise<string> {
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
    });

    const tools = toolRegistry
      ? toolRegistry.getDefinitionsForProvider('openai')
      : undefined;

    const messages: any[] = [{ role: 'user', content: instruction }];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const completion = await client.chat.completions.create({
        model,
        messages,
        max_tokens: 4096,
        ...(tools ? { tools } : {}),
      });

      const choice = completion.choices[0];
      const assistantMsg = choice.message;

      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0 || !toolRegistry) {
        return assistantMsg.content || 'No response from DeepSeek';
      }

      messages.push(assistantMsg);

      for (const call of assistantMsg.tool_calls) {
        const toolCall = call as any;
        const args = JSON.parse(toolCall.function.arguments);
        const result = await toolRegistry.execute(toolCall.function.name, args);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result.output,
        });
      }
    }

    return 'Reached maximum tool iterations.';
  } catch (error) {
    throw new Error(`DeepSeek API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
