import Anthropic from '@anthropic-ai/sdk';

export async function processWithAnthropic(instruction: string, apiKey: string, model: string): Promise<string> {
  try {
    const anthropic = new Anthropic({
      apiKey,
    });

    const message = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: instruction
        }
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    return 'No response from Claude';
  } catch (error) {
    throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
