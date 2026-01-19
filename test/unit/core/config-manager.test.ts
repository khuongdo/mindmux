import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigManager } from '../../../src/core/config-manager';

vi.mock('fs');
vi.mock('../../../src/utils/paths');
vi.mock('../../../src/utils/file-operations');
vi.mock('../../../src/utils/json-validator');

describe('ConfigManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Config loading', () => {
    it('should load config with defaults', () => {
      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config).toBeDefined();
      expect(config.version).toBeDefined();
    });

    it('should have default agent types', () => {
      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.defaultModel).toBeDefined();
      expect(config.defaultModel.claude).toBeDefined();
      expect(config.defaultModel.gemini).toBeDefined();
      expect(config.defaultModel.gpt4).toBeDefined();
    });

    it('should have logging configuration', () => {
      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.logging).toBeDefined();
      expect(config.logging.level).toBeDefined();
    });

    it('should have tmux configuration', () => {
      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.tmux).toBeDefined();
      expect(config.tmux.sessionPrefix).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should return current config', () => {
      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });
  });

  describe('Config hierarchy', () => {
    it('should merge configurations', () => {
      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config).toBeDefined();
      // Project local config should override global if present
      expect(config.timeout).toBeGreaterThan(0);
    });
  });

  describe('Path methods', () => {
    it('should provide global config path', () => {
      const configManager = new ConfigManager();
      const path = configManager.getGlobalConfigPath();

      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
    });

    it('should provide global agents path', () => {
      const configManager = new ConfigManager();
      const path = configManager.getGlobalAgentsPath();

      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
    });

    it('should provide logs directory', () => {
      const configManager = new ConfigManager();
      const path = configManager.getGlobalLogsDir();

      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
    });

    it('should provide cache directory', () => {
      const configManager = new ConfigManager();
      const path = configManager.getGlobalCacheDir();

      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
    });
  });
});
