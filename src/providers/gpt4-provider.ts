/**
 * GPT-4 Provider
 * OpenAI GPT-4 provider implementation with streaming support
 */

import OpenAI from 'openai';
import { AIProvider, AIProviderConfig } from './ai-provider-interface';
import { retryWithBackoff } from '../utils/retry';

export class GPT4Provider implements AIProvider {
  private client: OpenAI;
  private model: string;
  private maxTokens: number;

  constructor(apiKey: string, config?: AIProviderConfig) {
    this.client = new OpenAI({ apiKey });
    this.model = config?.model || 'gpt-4-turbo-preview';
    this.maxTokens = config?.maxTokens || 2048;
  }

  async sendMessage(prompt: string, context?: any): Promise<string> {
    return retryWithBackoff(async () => {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });

      return completion.choices[0]?.message?.content || '';
    }, 3);
  }

  async stream(
    prompt: string,
    onChunk: (text: string) => void,
    context?: any
  ): Promise<string> {
    return retryWithBackoff(async () => {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });

      let fullText = '';

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        fullText += text;
        onChunk(text);
      }

      return fullText;
    }, 3);
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.sendMessage('test');
      return true;
    } catch {
      return false;
    }
  }

  getModels(): string[] {
    return ['gpt-4-turbo-preview', 'gpt-4', 'gpt-4-32k'];
  }
}
