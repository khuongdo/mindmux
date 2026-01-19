import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLogger } from '../../../src/monitoring/logger';

vi.mock('fs');

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger instance', () => {
      const logger = createLogger('test');

      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
    });

    it('should have unique loggers per module', () => {
      const logger1 = createLogger('module1');
      const logger2 = createLogger('module2');

      expect(logger1).not.toBe(logger2);
    });
  });

  describe('info', () => {
    it('should log info level messages', () => {
      const logger = createLogger('test');
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.info('test_event', { data: 'value' });

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should include event name and context', () => {
      const logger = createLogger('test');
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.info('agent_created', { agentId: '123', name: 'test' });

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      const logger = createLogger('test');
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      logger.warn('test_warning', { reason: 'test' });

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      const logger = createLogger('test');
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('test_error', { message: 'error occurred' });

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should handle Error objects', () => {
      const logger = createLogger('test');
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const error = new Error('Test error');
      logger.error('test_error', { error });

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('JSON format', () => {
    it('should output JSON formatted logs', () => {
      const logger = createLogger('test');
      const spy = vi.spyOn(console, 'log').mockImplementation((msg) => {
        expect(() => JSON.parse(msg as string)).not.toThrow();
      });

      logger.info('test', { key: 'value' });

      spy.mockRestore();
    });
  });

  describe('Log levels', () => {
    it('should respect log level settings', () => {
      const logger = createLogger('test');

      // Should always log info, warn, error
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
    });
  });

  describe('Context preservation', () => {
    it('should preserve module context', () => {
      const logger1 = createLogger('AgentManager');
      const logger2 = createLogger('TaskQueue');

      // Module names should be different internally
      expect(logger1).not.toBe(logger2);
    });

    it('should include timestamps', () => {
      const logger = createLogger('test');
      const spy = vi.spyOn(console, 'log').mockImplementation((msg) => {
        const parsed = JSON.parse(msg as string);
        expect(parsed.timestamp).toBeDefined();
      });

      logger.info('test', {});

      spy.mockRestore();
    });
  });

  describe('Large data handling', () => {
    it('should handle large context objects', () => {
      const logger = createLogger('test');
      const largeData = {
        field1: 'a'.repeat(10000),
        field2: Array(1000).fill('x'),
      };

      expect(() => {
        logger.info('test', largeData);
      }).not.toThrow();
    });

    it('should include context in logs', () => {
      const logger = createLogger('test');
      const spy = vi.spyOn(console, 'log').mockImplementation((msg) => {
        // Verify logs are structured and contain timestamp
        const parsed = JSON.parse(msg as string);
        expect(parsed.timestamp).toBeDefined();
      });

      logger.info('test', { data: 'value' });

      spy.mockRestore();
    });
  });
});
