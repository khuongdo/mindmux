/**
 * Tests for input validators
 */

import { describe, it, expect } from 'vitest';
import {
  validateAgentName,
  validateAgentType,
  validateCapabilities,
  getAgentNameError,
  getAgentTypeError,
  getCapabilitiesError,
} from './validators';

describe('Input Validators', () => {
  describe('validateAgentName', () => {
    it('should validate a valid agent name', () => {
      expect(validateAgentName('my-agent')).toBe(true);
      expect(validateAgentName('agent_1')).toBe(true);
      expect(validateAgentName('MyAgent123')).toBe(true);
    });

    it('should accept exactly 3 character names', () => {
      expect(validateAgentName('abc')).toBe(true);
    });

    it('should accept exactly 64 character names', () => {
      const name = 'a'.repeat(64);
      expect(validateAgentName(name)).toBe(true);
    });

    it('should reject names shorter than 3 characters', () => {
      expect(validateAgentName('ab')).toBe(false);
      expect(validateAgentName('a')).toBe(false);
      expect(validateAgentName('')).toBe(false);
    });

    it('should reject names longer than 64 characters', () => {
      const name = 'a'.repeat(65);
      expect(validateAgentName(name)).toBe(false);
    });

    it('should reject names with invalid characters', () => {
      expect(validateAgentName('my agent')).toBe(false);
      expect(validateAgentName('my@agent')).toBe(false);
      expect(validateAgentName('my.agent')).toBe(false);
      expect(validateAgentName('my/agent')).toBe(false);
      expect(validateAgentName('my agent')).toBe(false);
    });

    it('should reject non-string input', () => {
      expect(validateAgentName(null as any)).toBe(false);
      expect(validateAgentName(undefined as any)).toBe(false);
      expect(validateAgentName(123 as any)).toBe(false);
      expect(validateAgentName({} as any)).toBe(false);
    });

    it('should accept hyphens and underscores', () => {
      expect(validateAgentName('my-agent')).toBe(true);
      expect(validateAgentName('my_agent')).toBe(true);
      expect(validateAgentName('my-agent_1')).toBe(true);
    });

    it('should accept alphanumeric characters', () => {
      expect(validateAgentName('agent123')).toBe(true);
      expect(validateAgentName('123agent')).toBe(true);
      expect(validateAgentName('Agent1Agent')).toBe(true);
    });
  });

  describe('validateAgentType', () => {
    it('should validate valid agent types', () => {
      expect(validateAgentType('claude')).toBe(true);
      expect(validateAgentType('gemini')).toBe(true);
      expect(validateAgentType('gpt4')).toBe(true);
      expect(validateAgentType('opencode')).toBe(true);
    });

    it('should reject invalid agent types', () => {
      expect(validateAgentType('invalid')).toBe(false);
      expect(validateAgentType('Claude')).toBe(false);
      expect(validateAgentType('CLAUDE')).toBe(false);
      expect(validateAgentType('gpt-4')).toBe(false);
    });

    it('should reject empty or falsy values', () => {
      expect(validateAgentType('')).toBe(false);
      expect(validateAgentType(null as any)).toBe(false);
      expect(validateAgentType(undefined as any)).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(validateAgentType('Claude')).toBe(false);
      expect(validateAgentType('GEMINI')).toBe(false);
      expect(validateAgentType('GPT4')).toBe(false);
    });
  });

  describe('validateCapabilities', () => {
    it('should validate valid capabilities', () => {
      expect(validateCapabilities(['code-generation'])).toBe(true);
      expect(validateCapabilities(['code-review'])).toBe(true);
      expect(validateCapabilities(['debugging'])).toBe(true);
      expect(validateCapabilities(['testing'])).toBe(true);
      expect(validateCapabilities(['documentation'])).toBe(true);
      expect(validateCapabilities(['planning'])).toBe(true);
      expect(validateCapabilities(['research'])).toBe(true);
      expect(validateCapabilities(['refactoring'])).toBe(true);
    });

    it('should validate multiple valid capabilities', () => {
      expect(validateCapabilities(['code-generation', 'code-review'])).toBe(true);
      expect(validateCapabilities(['testing', 'debugging', 'documentation'])).toBe(true);
    });

    it('should reject invalid capabilities', () => {
      expect(validateCapabilities(['invalid-capability'])).toBe(false);
      expect(validateCapabilities(['code-gen'])).toBe(false);
    });

    it('should reject empty array', () => {
      expect(validateCapabilities([])).toBe(false);
    });

    it('should reject non-array input', () => {
      expect(validateCapabilities(null as any)).toBe(false);
      expect(validateCapabilities(undefined as any)).toBe(false);
      expect(validateCapabilities('code-generation' as any)).toBe(false);
    });

    it('should reject array with any invalid capability', () => {
      expect(validateCapabilities(['code-generation', 'invalid'])).toBe(false);
      expect(validateCapabilities(['testing', 'bad-cap'])).toBe(false);
    });

    it('should allow all 8 valid capabilities together', () => {
      const allCaps = [
        'code-generation',
        'code-review',
        'debugging',
        'testing',
        'documentation',
        'planning',
        'research',
        'refactoring',
      ];
      expect(validateCapabilities(allCaps)).toBe(true);
    });
  });

  describe('getAgentNameError', () => {
    it('should return empty string for valid names', () => {
      expect(getAgentNameError('my-agent')).toBe('');
      expect(getAgentNameError('agent123')).toBe('');
    });

    it('should return error for missing name', () => {
      expect(getAgentNameError('')).toContain('required');
    });

    it('should return error for names too short', () => {
      const error = getAgentNameError('ab');
      expect(error).toContain('3 characters');
    });

    it('should return error for names too long', () => {
      const error = getAgentNameError('a'.repeat(65));
      expect(error).toContain('64 characters');
    });

    it('should return error for invalid characters', () => {
      const error = getAgentNameError('my agent');
      expect(error).toContain('alphanumeric');
    });

    it('should be specific about validation rules', () => {
      const error1 = getAgentNameError('ab');
      expect(error1).toContain('3');

      const error2 = getAgentNameError('my@agent');
      expect(error2).toContain('alphanumeric');
    });
  });

  describe('getAgentTypeError', () => {
    it('should return empty string for valid types', () => {
      expect(getAgentTypeError('claude')).toBe('');
      expect(getAgentTypeError('gemini')).toBe('');
    });

    it('should return error for missing type', () => {
      const error = getAgentTypeError('');
      expect(error).toContain('required');
    });

    it('should return error for invalid type', () => {
      const error = getAgentTypeError('invalid');
      expect(error).toContain('Invalid agent type');
    });

    it('should list valid types in error message', () => {
      const error = getAgentTypeError('invalid');
      expect(error).toContain('claude');
      expect(error).toContain('gemini');
      expect(error).toContain('gpt4');
      expect(error).toContain('opencode');
    });

    it('should be case-sensitive in validation', () => {
      const error = getAgentTypeError('CLAUDE');
      expect(error).toContain('Invalid agent type');
    });
  });

  describe('getCapabilitiesError', () => {
    it('should return empty string for valid capabilities', () => {
      expect(getCapabilitiesError(['code-generation'])).toBe('');
      expect(getCapabilitiesError(['code-review', 'testing'])).toBe('');
    });

    it('should return error for empty array', () => {
      const error = getCapabilitiesError([]);
      expect(error).toContain('At least one capability');
    });

    it('should return error for invalid capabilities', () => {
      const error = getCapabilitiesError(['invalid-cap']);
      expect(error).toContain('Invalid capabilities');
    });

    it('should list invalid capabilities in error', () => {
      const error = getCapabilitiesError(['code-generation', 'bad-cap']);
      expect(error).toContain('bad-cap');
    });

    it('should list valid capabilities in error message', () => {
      const error = getCapabilitiesError(['invalid']);
      expect(error).toContain('Valid:');
      expect(error).toContain('code-generation');
    });

    it('should handle multiple invalid capabilities', () => {
      const error = getCapabilitiesError(['bad1', 'bad2', 'code-generation', 'bad3']);
      expect(error).toContain('Invalid capabilities');
      expect(error).toContain('bad1');
      expect(error).toContain('bad2');
      expect(error).toContain('bad3');
    });
  });

  describe('Integration: validation flows', () => {
    it('should work with valid agent creation parameters', () => {
      const name = 'my-dev-agent';
      const type = 'claude';
      const capabilities = ['code-generation', 'code-review'];

      expect(validateAgentName(name)).toBe(true);
      expect(getAgentNameError(name)).toBe('');

      expect(validateAgentType(type)).toBe(true);
      expect(getAgentTypeError(type)).toBe('');

      expect(validateCapabilities(capabilities)).toBe(true);
      expect(getCapabilitiesError(capabilities)).toBe('');
    });

    it('should catch all validation errors', () => {
      expect(validateAgentName('xy')).toBe(false);
      expect(getAgentNameError('xy')).not.toBe('');

      expect(validateAgentType('invalid')).toBe(false);
      expect(getAgentTypeError('invalid')).not.toBe('');

      expect(validateCapabilities([])).toBe(false);
      expect(getCapabilitiesError([])).not.toBe('');
    });
  });
});
