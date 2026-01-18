/**
 * OpenCode Provider
 * Placeholder for OpenCode AI provider (not yet implemented)
 */

import { AIProvider, AIProviderConfig } from './ai-provider-interface';

export class OpenCodeProvider implements AIProvider {
  constructor(apiKey: string, config?: AIProviderConfig) {
    throw new Error('OpenCode provider not yet implemented');
  }

  async sendMessage(prompt: string, context?: any): Promise<string> {
    throw new Error('OpenCode provider not yet implemented');
  }

  async stream(
    prompt: string,
    onChunk: (text: string) => void,
    context?: any
  ): Promise<string> {
    throw new Error('OpenCode provider not yet implemented');
  }

  async validateApiKey(): Promise<boolean> {
    return false;
  }

  getModels(): string[] {
    return [];
  }
}
