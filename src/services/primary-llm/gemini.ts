import { GoogleGenerativeAI } from '@google/generative-ai';

export async function processWithGemini(instruction: string, apiKey: string, model: string): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const genModel = genAI.getGenerativeModel({ model });

    const result = await genModel.generateContent(instruction);
    const response = result.response;
    return response.text();
  } catch (error) {
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
