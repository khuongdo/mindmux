/**
 * AI Provider Factory
 * Factory for creating AI provider instances with API key validation
 */

import { AIProvider, AIProviderConfig } from './ai-provider-interface';
import { ClaudeProvider } from './claude-provider';
import { GeminiProvider } from './gemini-provider';
import { GPT4Provider } from './gpt4-provider';
import { OpenCodeProvider } from './opencode-provider';
import { AgentType } from '../core/types';

export class AIProviderFactory {
  static create(type: AgentType, config?: AIProviderConfig): AIProvider {
    switch (type) {
      case 'claude':
        const claudeKey = process.env.ANTHROPIC_API_KEY;
        if (!claudeKey) {
          throw new Error('ANTHROPIC_API_KEY not set in environment');
        }
        return new ClaudeProvider(claudeKey, config);

      case 'gemini':
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
          throw new Error('GEMINI_API_KEY not set in environment');
        }
        return new GeminiProvider(geminiKey, config);

      case 'gpt4':
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          throw new Error('OPENAI_API_KEY not set in environment');
        }
        return new GPT4Provider(openaiKey, config);

      case 'opencode':
        throw new Error('OpenCode provider not yet implemented');

      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }
}
