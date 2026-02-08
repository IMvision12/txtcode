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
      }
      
      return '❌ Unsupported AI provider';
    } catch (error) {
      throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processWithAnthropic(instruction: string): Promise<string> {
    // TODO: Implement Anthropic API call
    return `[Anthropic] Would process: ${instruction}`;
  }

  private async processWithOpenAI(instruction: string): Promise<string> {
    // TODO: Implement OpenAI API call
    return `[OpenAI] Would process: ${instruction}`;
  }
}
