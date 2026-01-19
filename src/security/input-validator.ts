/**
 * Input Validator
 * Validates and sanitizes user inputs to prevent injection attacks
 * Uses whitelist approach for agent names, prompts, capabilities, etc.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class InputValidator {
  /**
   * Allowed agent capabilities
   */
  private static readonly VALID_CAPABILITIES = [
    'code-generation',
    'code-review',
    'debugging',
    'testing',
    'documentation',
    'planning',
    'research',
    'refactoring',
  ];

  /**
   * Agent name pattern (alphanumeric, hyphens, underscores)
   */
  private static readonly AGENT_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,255}$/;

  /**
   * Unsafe characters for prompt input
   */
  private static readonly UNSAFE_PROMPT_CHARS = /[;&|`$<>{}]/;

  /**
   * Max prompt size (100KB)
   */
  private static readonly MAX_PROMPT_SIZE = 100 * 1024;

  /**
   * Validate agent name
   */
  static validateAgentName(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Agent name must be a non-empty string');
    }

    if (!this.AGENT_NAME_PATTERN.test(name)) {
      throw new ValidationError(
        'Agent name must contain only alphanumeric characters, hyphens, and underscores (1-255 chars)'
      );
    }
  }

  /**
   * Validate prompt text
   */
  static validatePrompt(prompt: string): void {
    if (!prompt || typeof prompt !== 'string') {
      throw new ValidationError('Prompt must be a non-empty string');
    }

    if (prompt.length > this.MAX_PROMPT_SIZE) {
      throw new ValidationError(`Prompt exceeds maximum size of ${this.MAX_PROMPT_SIZE} bytes`);
    }

    if (this.UNSAFE_PROMPT_CHARS.test(prompt)) {
      throw new ValidationError('Prompt contains unsafe characters: ; & | ` $ < > { }');
    }
  }

  /**
   * Validate capabilities array
   */
  static validateCapabilities(capabilities: unknown[]): void {
    if (!Array.isArray(capabilities)) {
      throw new ValidationError('Capabilities must be an array');
    }

    if (capabilities.length === 0) {
      throw new ValidationError('At least one capability is required');
    }

    for (const cap of capabilities) {
      if (typeof cap !== 'string') {
        throw new ValidationError('Each capability must be a string');
      }

      if (!this.VALID_CAPABILITIES.includes(cap)) {
        throw new ValidationError(
          `Unknown capability: ${cap}. Valid: ${this.VALID_CAPABILITIES.join(', ')}`
        );
      }
    }
  }

  /**
   * Sanitize database query parameter (prevent SQL injection)
   */
  static sanitizeQueryParam(param: string): string {
    if (typeof param !== 'string') {
      throw new ValidationError('Query parameter must be a string');
    }

    // Remove null bytes
    return param.replace(/\0/g, '');
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): void {
    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email must be a non-empty string');
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  /**
   * Validate URL
   */
  static validateURL(url: string): void {
    if (!url || typeof url !== 'string') {
      throw new ValidationError('URL must be a non-empty string');
    }

    try {
      new URL(url);
    } catch (error) {
      throw new ValidationError('Invalid URL format');
    }
  }

  /**
   * Validate JSON
   */
  static validateJSON(jsonStr: string): Record<string, unknown> {
    if (typeof jsonStr !== 'string') {
      throw new ValidationError('JSON must be a string');
    }

    try {
      return JSON.parse(jsonStr) as Record<string, unknown>;
    } catch (error) {
      throw new ValidationError('Invalid JSON format');
    }
  }

  /**
   * Validate agent type
   */
  static validateAgentType(type: string): void {
    const validTypes = ['claude', 'gemini', 'gpt4', 'opencode'];
    if (!validTypes.includes(type)) {
      throw new ValidationError(`Invalid agent type: ${type}. Valid: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Sanitize string for logging (prevent injection)
   */
  static sanitizeForLogging(value: string): string {
    if (typeof value !== 'string') {
      return String(value);
    }

    // Remove ANSI escape sequences
    return value.replace(/\x1b\[[0-9;]*m/g, '');
  }

  /**
   * Get valid capabilities list
   */
  static getValidCapabilities(): string[] {
    return [...this.VALID_CAPABILITIES];
  }
}
