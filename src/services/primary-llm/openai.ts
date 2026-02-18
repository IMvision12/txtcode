import OpenAI from 'openai';

export async function processWithOpenAI(instruction: string, apiKey: string): Promise<string> {
  try {
    const openai = new OpenAI({
      apiKey,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: instruction
        }
      ],
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || 'No response from GPT';
  } catch (error) {
    throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
