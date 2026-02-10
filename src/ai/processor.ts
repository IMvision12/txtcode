import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class AIProcessor {
  private provider: string;
  private apiKey: string;

  constructor() {
    this.provider = process.env.AI_PROVIDER || 'anthropic';
    this.apiKey = process.env.AI_API_KEY || '';
  }

  async process(instruction: string): Promise<string> {
    if (!this.apiKey) {
      return '⚠️ AI API key not configured. Run: opencode config';
    }

    try {
      if (this.provider === 'anthropic') {
        return await this.processWithAnthropic(instruction);
      } else if (this.provider === 'openai') {
        return await this.processWithOpenAI(instruction);
      } else if (this.provider === 'gemini') {
        return await this.processWithGemini(instruction);
      }
      
      return `❌ Unsupported AI provider: ${this.provider}`;
    } catch (error) {
      throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processWithAnthropic(instruction: string): Promise<string> {
    try {
      const anthropic = new Anthropic({
        apiKey: this.apiKey,
      });

      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
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

  private async processWithOpenAI(instruction: string): Promise<string> {
    try {
      const openai = new OpenAI({
        apiKey: this.apiKey,
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

  private async processWithGemini(instruction: string): Promise<string> {
    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

      const result = await model.generateContent(instruction);
      const response = result.response;
      return response.text();
    } catch (error) {
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
