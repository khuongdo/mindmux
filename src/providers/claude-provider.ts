/**
 * Claude Provider
 * Anthropic Claude AI provider implementation with streaming support
 */

import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIProviderConfig } from './ai-provider-interface';
import { retryWithBackoff } from '../utils/retry';

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(apiKey: string, config?: AIProviderConfig) {
    this.client = new Anthropic({ apiKey });
    this.model = config?.model || 'claude-opus-4-5-20250929';
    this.maxTokens = config?.maxTokens || 2048;
  }

  async sendMessage(prompt: string, context?: any): Promise<string> {
    return retryWithBackoff(async () => {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });

      return message.content[0].type === 'text'
        ? message.content[0].text
        : '';
    }, 3);
  }

  async stream(
    prompt: string,
    onChunk: (text: string) => void,
    context?: any
  ): Promise<string> {
    return retryWithBackoff(async () => {
      const stream = await this.client.messages.stream({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });

      let fullText = '';

      stream.on('text', (text) => {
        fullText += text;
        onChunk(text);
      });

      await stream.finalMessage();
      return fullText;
    }, 3);
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.sendMessage('test');
      return true;
    } catch (error) {
      return false;
    }
  }

  getModels(): string[] {
    return [
      'claude-opus-4-5-20250929',
      'claude-sonnet-4-5-20250929',
      'claude-haiku-4-20250113',
    ];
  }
}
