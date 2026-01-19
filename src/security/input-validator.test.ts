/**
 * Tests for Input Validator
 */

import { describe, it, expect } from 'vitest';
import { InputValidator, ValidationError } from './input-validator.js';

describe('InputValidator', () => {
  describe('validateAgentName', () => {
    it('should accept valid names', () => {
      expect(() => InputValidator.validateAgentName('my-agent')).not.toThrow();
      expect(() => InputValidator.validateAgentName('agent_123')).not.toThrow();
      expect(() => InputValidator.validateAgentName('AgentOne')).not.toThrow();
    });

    it('should reject invalid names', () => {
      expect(() => InputValidator.validateAgentName('agent@name')).toThrow(ValidationError);
      expect(() => InputValidator.validateAgentName('agent name')).toThrow(ValidationError);
      expect(() => InputValidator.validateAgentName('agent!')).toThrow(ValidationError);
      expect(() => InputValidator.validateAgentName('')).toThrow(ValidationError);
    });

    it('should reject names exceeding length limit', () => {
      const longName = 'a'.repeat(256);
      expect(() => InputValidator.validateAgentName(longName)).toThrow(ValidationError);
    });
  });

  describe('validatePrompt', () => {
    it('should accept valid prompts', () => {
      expect(() => InputValidator.validatePrompt('Hello, please help me')).not.toThrow();
      expect(() => InputValidator.validatePrompt('Please analyze this code')).not.toThrow();
    });

    it('should reject unsafe characters', () => {
      expect(() => InputValidator.validatePrompt('echo hello;')).toThrow(ValidationError);
      expect(() => InputValidator.validatePrompt('echo $(cat file)')).toThrow(ValidationError);
      expect(() => InputValidator.validatePrompt('pipe | command')).toThrow(ValidationError);
      expect(() => InputValidator.validatePrompt('test & background')).toThrow(ValidationError);
      expect(() => InputValidator.validatePrompt('test`backtick`')).toThrow(ValidationError);
      expect(() => InputValidator.validatePrompt('test<redirect')).toThrow(ValidationError);
      expect(() => InputValidator.validatePrompt('test>redirect')).toThrow(ValidationError);
    });

    it('should reject oversized prompts', () => {
      const largePrompt = 'a'.repeat(100 * 1024 + 1);
      expect(() => InputValidator.validatePrompt(largePrompt)).toThrow(ValidationError);
    });

    it('should reject empty prompts', () => {
      expect(() => InputValidator.validatePrompt('')).toThrow(ValidationError);
    });
  });

  describe('validateCapabilities', () => {
    it('should accept valid capabilities', () => {
      expect(() => InputValidator.validateCapabilities(['code-generation', 'code-review'])).not.toThrow();
      expect(() => InputValidator.validateCapabilities(['debugging'])).not.toThrow();
    });

    it('should reject invalid capabilities', () => {
      expect(() => InputValidator.validateCapabilities(['unknown-capability'])).toThrow(ValidationError);
      expect(() => InputValidator.validateCapabilities(['code-generation', 'invalid'])).toThrow(
        ValidationError
      );
    });

    it('should reject non-array input', () => {
      expect(() => InputValidator.validateCapabilities('code-generation' as any)).toThrow(ValidationError);
    });

    it('should reject empty array', () => {
      expect(() => InputValidator.validateCapabilities([])).toThrow(ValidationError);
    });

    it('should reject non-string array elements', () => {
      expect(() => InputValidator.validateCapabilities(['code-generation', 123 as any])).toThrow(
        ValidationError
      );
    });
  });

  describe('sanitizeQueryParam', () => {
    it('should remove null bytes', () => {
      const sanitized = InputValidator.sanitizeQueryParam('test\x00string');
      expect(sanitized).toBe('teststring');
    });

    it('should preserve normal strings', () => {
      const sanitized = InputValidator.sanitizeQueryParam('normal_string');
      expect(sanitized).toBe('normal_string');
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(() => InputValidator.validateEmail('user@example.com')).not.toThrow();
      expect(() => InputValidator.validateEmail('test.user+tag@domain.co.uk')).not.toThrow();
    });

    it('should reject invalid emails', () => {
      expect(() => InputValidator.validateEmail('invalid@')).toThrow(ValidationError);
      expect(() => InputValidator.validateEmail('@invalid.com')).toThrow(ValidationError);
      expect(() => InputValidator.validateEmail('invalid')).toThrow(ValidationError);
      expect(() => InputValidator.validateEmail('')).toThrow(ValidationError);
    });
  });

  describe('validateURL', () => {
    it('should accept valid URLs', () => {
      expect(() => InputValidator.validateURL('https://example.com')).not.toThrow();
      expect(() => InputValidator.validateURL('http://localhost:3000')).not.toThrow();
    });

    it('should reject invalid URLs', () => {
      expect(() => InputValidator.validateURL('not-a-url')).toThrow(ValidationError);
      expect(() => InputValidator.validateURL('://broken')).toThrow(ValidationError);
      expect(() => InputValidator.validateURL('')).toThrow(ValidationError);
    });
  });

  describe('validateJSON', () => {
    it('should parse valid JSON', () => {
      const result = InputValidator.validateJSON('{"key": "value"}');
      expect(result.key).toBe('value');
    });

    it('should reject invalid JSON', () => {
      expect(() => InputValidator.validateJSON('{invalid}')).toThrow(ValidationError);
      expect(() => InputValidator.validateJSON('not json')).toThrow(ValidationError);
    });
  });

  describe('validateAgentType', () => {
    it('should accept valid types', () => {
      expect(() => InputValidator.validateAgentType('claude')).not.toThrow();
      expect(() => InputValidator.validateAgentType('gemini')).not.toThrow();
      expect(() => InputValidator.validateAgentType('gpt4')).not.toThrow();
      expect(() => InputValidator.validateAgentType('opencode')).not.toThrow();
    });

    it('should reject invalid types', () => {
      expect(() => InputValidator.validateAgentType('invalid')).toThrow(ValidationError);
      expect(() => InputValidator.validateAgentType('claude-3')).toThrow(ValidationError);
    });
  });

  describe('sanitizeForLogging', () => {
    it('should remove ANSI escape sequences', () => {
      const logged = InputValidator.sanitizeForLogging('\x1b[31mRed\x1b[0m');
      expect(logged).toBe('Red');
    });

    it('should preserve non-ANSI strings', () => {
      const logged = InputValidator.sanitizeForLogging('Normal text');
      expect(logged).toBe('Normal text');
    });
  });

  describe('getValidCapabilities', () => {
    it('should return list of valid capabilities', () => {
      const caps = InputValidator.getValidCapabilities();
      expect(caps).toContain('code-generation');
      expect(caps).toContain('code-review');
      expect(caps).toContain('debugging');
      expect(caps).toContain('testing');
    });
  });
});
