/**
 * AI Provider Interface
 * Unified interface for all AI providers (Claude, Gemini, GPT-4, OpenCode)
 */

export interface AIProviderConfig {
  model?: string;
  maxTokens?: number;
  timeout?: number;
}

export interface AIProvider {
  /**
   * Send message and get complete response
   */
  sendMessage(prompt: string, context?: any): Promise<string>;

  /**
   * Stream response with real-time chunks
   */
  stream(
    prompt: string,
    onChunk: (text: string) => void,
    context?: any
  ): Promise<string>;

  /**
   * Validate API key is working
   */
  validateApiKey(): Promise<boolean>;

  /**
   * Get available models for this provider
   */
  getModels(): string[];
}

export interface StreamOptions {
  onStart?: () => void;
  onChunk: (text: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}
