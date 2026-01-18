/**
 * Gemini Provider
 * Google Gemini AI provider implementation with streaming support
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AIProviderConfig } from './ai-provider-interface';
import { retryWithBackoff } from '../utils/retry';

export class GeminiProvider implements AIProvider {
  private model: any;
  private modelName: string;

  constructor(apiKey: string, config?: AIProviderConfig) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = config?.model || 'gemini-2.0-flash-exp';
    this.model = genAI.getGenerativeModel({
      model: this.modelName
    });
  }

  async sendMessage(prompt: string, context?: any): Promise<string> {
    return retryWithBackoff(async () => {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    }, 3);
  }

  async stream(
    prompt: string,
    onChunk: (text: string) => void,
    context?: any
  ): Promise<string> {
    return retryWithBackoff(async () => {
      const stream = await this.model.generateContentStream(prompt);
      let fullText = '';

      for await (const chunk of stream.stream) {
        const text = chunk.text();
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
    return ['gemini-2.0-flash-exp', 'gemini-2.5-flash', 'gemini-2.5-pro'];
  }
}
