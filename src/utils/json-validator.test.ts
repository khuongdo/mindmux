/**
 * Tests for JSON validators
 */

import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  validateMindMuxConfig,
  validateAgent,
  validateMindMuxMetadata,
  validateAgentsStore,
  safeValidate,
} from './json-validator';
import { DEFAULT_CONFIG } from './defaults';

describe('JSON Validators', () => {
  describe('validateMindMuxConfig', () => {
    it('should validate a valid MindMux config', () => {
      const config = DEFAULT_CONFIG;
      expect(() => validateMindMuxConfig(config)).not.toThrow();
    });

    it('should validate config with correct structure', () => {
      const result = validateMindMuxConfig(DEFAULT_CONFIG);

      expect(result.version).toBe('0.1.0');
      expect(result.defaultAgentType).toBe('claude');
      expect(result.defaultModel).toBeDefined();
      expect(result.timeout).toBeGreaterThan(0);
    });

    it('should reject null config', () => {
      expect(() => validateMindMuxConfig(null)).toThrow(ValidationError);
    });

    it('should reject non-object config', () => {
      expect(() => validateMindMuxConfig('not an object')).toThrow(
        ValidationError
      );
    });

    it('should reject config with missing version', () => {
      const config = { ...DEFAULT_CONFIG };
      delete (config as any).version;

      expect(() => validateMindMuxConfig(config)).toThrow(ValidationError);
    });

    it('should reject config with invalid defaultAgentType', () => {
      const config = { ...DEFAULT_CONFIG, defaultAgentType: 'invalid' as any };

      expect(() => validateMindMuxConfig(config)).toThrow(ValidationError);
    });

    it('should reject config with missing models', () => {
      const config = {
        ...DEFAULT_CONFIG,
        defaultModel: { claude: 'model' },
      };

      expect(() => validateMindMuxConfig(config)).toThrow(ValidationError);
    });

    it('should reject config with zero or negative timeout', () => {
      const config = { ...DEFAULT_CONFIG, timeout: 0 };

      expect(() => validateMindMuxConfig(config)).toThrow(ValidationError);
    });

    it('should reject config with invalid logging level', () => {
      const config = {
        ...DEFAULT_CONFIG,
        logging: { ...DEFAULT_CONFIG.logging, level: 'invalid' as any },
      };

      expect(() => validateMindMuxConfig(config)).toThrow(ValidationError);
    });

    it('should reject config with invalid maxConcurrentAgents', () => {
      const config = { ...DEFAULT_CONFIG, maxConcurrentAgents: -1 };

      expect(() => validateMindMuxConfig(config)).toThrow(ValidationError);
    });
  });

  describe('validateAgent', () => {
    const validAgent = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'test-agent',
      type: 'claude' as const,
      capabilities: ['code-generation'],
      status: 'idle' as const,
      createdAt: new Date().toISOString(),
      config: {
        model: 'claude-opus',
        maxConcurrentTasks: 1,
        timeout: 3600000,
      },
    };

    it('should validate a valid agent', () => {
      expect(() => validateAgent(validAgent)).not.toThrow();
    });

    it('should reject null agent', () => {
      expect(() => validateAgent(null)).toThrow(ValidationError);
    });

    it('should reject agent with invalid UUID', () => {
      const agent = { ...validAgent, id: 'not-a-uuid' };

      expect(() => validateAgent(agent)).toThrow(ValidationError);
    });

    it('should reject agent with empty name', () => {
      const agent = { ...validAgent, name: '' };

      expect(() => validateAgent(agent)).toThrow(ValidationError);
    });

    it('should reject agent with invalid type', () => {
      const agent = { ...validAgent, type: 'invalid' as any };

      expect(() => validateAgent(agent)).toThrow(ValidationError);
    });

    it('should reject agent with non-array capabilities', () => {
      const agent = { ...validAgent, capabilities: 'code-generation' };

      expect(() => validateAgent(agent)).toThrow(ValidationError);
    });

    it('should reject agent with invalid status', () => {
      const agent = { ...validAgent, status: 'unknown' as any };

      expect(() => validateAgent(agent)).toThrow(ValidationError);
    });

    it('should reject agent with invalid createdAt', () => {
      const agent = { ...validAgent, createdAt: 'not-a-date' };

      expect(() => validateAgent(agent)).toThrow(ValidationError);
    });

    it('should accept agent with optional lastActivity', () => {
      const agent = {
        ...validAgent,
        lastActivity: new Date().toISOString(),
      };

      expect(() => validateAgent(agent)).not.toThrow();
    });

    it('should reject agent with invalid lastActivity format', () => {
      const agent = { ...validAgent, lastActivity: 'not-a-date' };

      expect(() => validateAgent(agent)).toThrow(ValidationError);
    });

    it('should accept agent with all status types', () => {
      const statuses: Array<'idle' | 'busy' | 'unhealthy'> = [
        'idle',
        'busy',
        'unhealthy',
      ];

      statuses.forEach(status => {
        const agent = { ...validAgent, status };
        expect(() => validateAgent(agent)).not.toThrow();
      });
    });

    it('should accept agent with all agent types', () => {
      const types: Array<'claude' | 'gemini' | 'gpt4' | 'opencode'> = [
        'claude',
        'gemini',
        'gpt4',
        'opencode',
      ];

      types.forEach(type => {
        const agent = { ...validAgent, type };
        expect(() => validateAgent(agent)).not.toThrow();
      });
    });
  });

  describe('validateMindMuxMetadata', () => {
    const validMetadata = {
      version: '0.1.0',
      installedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      userId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should validate valid metadata', () => {
      expect(() => validateMindMuxMetadata(validMetadata)).not.toThrow();
    });

    it('should reject null metadata', () => {
      expect(() => validateMindMuxMetadata(null)).toThrow(ValidationError);
    });

    it('should reject metadata with missing version', () => {
      const metadata = { ...validMetadata };
      delete (metadata as any).version;

      expect(() => validateMindMuxMetadata(metadata)).toThrow(ValidationError);
    });

    it('should reject metadata with invalid installedAt', () => {
      const metadata = { ...validMetadata, installedAt: 'not-a-date' };

      expect(() => validateMindMuxMetadata(metadata)).toThrow(ValidationError);
    });

    it('should reject metadata with invalid lastUpdated', () => {
      const metadata = { ...validMetadata, lastUpdated: 'not-a-date' };

      expect(() => validateMindMuxMetadata(metadata)).toThrow(ValidationError);
    });

    it('should reject metadata with invalid userId', () => {
      const metadata = { ...validMetadata, userId: 'not-a-uuid' };

      expect(() => validateMindMuxMetadata(metadata)).toThrow(ValidationError);
    });
  });

  describe('validateAgentsStore', () => {
    const validAgent = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'test-agent',
      type: 'claude' as const,
      capabilities: ['code-generation'],
      status: 'idle' as const,
      createdAt: new Date().toISOString(),
      config: { model: 'test', maxConcurrentTasks: 1, timeout: 3600000 },
    };

    it('should validate empty agents store', () => {
      const store = { agents: [] };

      expect(() => validateAgentsStore(store)).not.toThrow();
    });

    it('should validate store with agents', () => {
      const store = { agents: [validAgent] };

      expect(() => validateAgentsStore(store)).not.toThrow();
    });

    it('should reject store without agents array', () => {
      const store = {};

      expect(() => validateAgentsStore(store)).toThrow(ValidationError);
    });

    it('should reject store with non-array agents', () => {
      const store = { agents: 'not-an-array' };

      expect(() => validateAgentsStore(store)).toThrow(ValidationError);
    });

    it('should reject store with invalid agent', () => {
      const store = {
        agents: [{ ...validAgent, id: 'invalid-uuid' }],
      };

      expect(() => validateAgentsStore(store)).toThrow(ValidationError);
    });

    it('should handle multiple agents', () => {
      const store = {
        agents: [
          validAgent,
          { ...validAgent, id: '550e8400-e29b-41d4-a716-446655440001' },
          { ...validAgent, id: '550e8400-e29b-41d4-a716-446655440002' },
        ],
      };

      expect(() => validateAgentsStore(store)).not.toThrow();
    });
  });

  describe('safeValidate', () => {
    it('should call validator and return result', () => {
      const validator = (data: any) => data.value * 2;
      const result = safeValidate({ value: 5 }, validator, 'test');

      expect(result).toBe(10);
    });

    it('should wrap ValidationError with context', () => {
      const validator = () => {
        throw new ValidationError('Test error');
      };

      expect(() => {
        safeValidate({}, validator, 'test-context');
      }).toThrow('Validation failed for test-context');
    });

    it('should wrap unexpected errors with context', () => {
      const validator = () => {
        throw new Error('Unexpected error');
      };

      expect(() => {
        safeValidate({}, validator, 'test-context');
      }).toThrow('Unexpected error validating test-context');
    });

    it('should provide helpful error messages', () => {
      const validator = validateMindMuxConfig;

      try {
        safeValidate({}, validator, 'config');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('config');
      }
    });
  });

  describe('ValidationError', () => {
    it('should be instanceof Error', () => {
      const error = new ValidationError('Test');
      expect(error instanceof Error).toBe(true);
    });

    it('should have ValidationError name', () => {
      const error = new ValidationError('Test');
      expect(error.name).toBe('ValidationError');
    });

    it('should preserve message', () => {
      const message = 'Custom validation error';
      const error = new ValidationError(message);
      expect(error.message).toBe(message);
    });
  });

  describe('Edge cases and special values', () => {
    it('should handle ISO dates at boundaries', () => {
      const metadata = {
        version: '0.1.0',
        installedAt: new Date('2020-01-01T00:00:00.000Z').toISOString(),
        lastUpdated: new Date('2099-12-31T23:59:59.999Z').toISOString(),
        userId: '550e8400-e29b-41d4-a716-446655440000',
      };

      expect(() => validateMindMuxMetadata(metadata)).not.toThrow();
    });

    it('should validate config with minimal values', () => {
      const config = {
        version: '0.1.0',
        defaultAgentType: 'claude',
        defaultModel: {
          claude: 'model1',
          gemini: 'model2',
          gpt4: 'model3',
          opencode: 'model4',
        },
        timeout: 1,
        maxConcurrentAgents: 1,
        logging: {
          level: 'debug',
          enableAgentLogs: false,
          maxLogSizeMB: 1,
        },
        tmux: {
          sessionPrefix: 'a',
          keepSessionsAlive: false,
        },
      };

      expect(() => validateMindMuxConfig(config)).not.toThrow();
    });
  });
});
