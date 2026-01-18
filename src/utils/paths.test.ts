/**
 * Tests for path utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { homedir } from 'os';
import { join } from 'path';
import {
  getGlobalConfigDir,
  getProjectConfigDir,
  getGlobalConfigPath,
  getGlobalAgentsPath,
  getGlobalMetadataPath,
  getGlobalLogsDir,
  getGlobalAgentLogsDir,
  getGlobalCacheDir,
  getGlobalSessionCacheDir,
} from './paths';

describe('Path Utilities', () => {
  describe('Global config paths', () => {
    it('should return correct global config directory', () => {
      const dir = getGlobalConfigDir();
      expect(dir).toBe(join(homedir(), '.mindmux'));
    });

    it('should return correct global config file path', () => {
      const path = getGlobalConfigPath();
      expect(path).toBe(join(homedir(), '.mindmux', 'config.json'));
    });

    it('should return correct global agents file path', () => {
      const path = getGlobalAgentsPath();
      expect(path).toBe(join(homedir(), '.mindmux', 'agents.json'));
    });

    it('should return correct global metadata file path', () => {
      const path = getGlobalMetadataPath();
      expect(path).toBe(join(homedir(), '.mindmux', 'metadata.json'));
    });

    it('should return correct global logs directory', () => {
      const dir = getGlobalLogsDir();
      expect(dir).toBe(join(homedir(), '.mindmux', 'logs'));
    });

    it('should return correct global agent logs directory', () => {
      const dir = getGlobalAgentLogsDir();
      expect(dir).toBe(join(homedir(), '.mindmux', 'logs', 'agents'));
    });

    it('should return correct global cache directory', () => {
      const dir = getGlobalCacheDir();
      expect(dir).toBe(join(homedir(), '.mindmux', 'cache'));
    });

    it('should return correct global session cache directory', () => {
      const dir = getGlobalSessionCacheDir();
      expect(dir).toBe(join(homedir(), '.mindmux', 'cache', 'sessions'));
    });
  });

  describe('Project config paths', () => {
    it('should return correct project config directory', () => {
      const dir = getProjectConfigDir();
      expect(dir).toBe(join(process.cwd(), '.mindmux'));
    });
  });

  describe('Path hierarchy', () => {
    it('should have global config dir containing all global files', () => {
      const globalDir = getGlobalConfigDir();
      const configPath = getGlobalConfigPath();
      const agentsPath = getGlobalAgentsPath();

      expect(configPath).toContain(globalDir);
      expect(agentsPath).toContain(globalDir);
    });

    it('should have global cache dir as parent of session cache dir', () => {
      const cacheDir = getGlobalCacheDir();
      const sessionDir = getGlobalSessionCacheDir();
      expect(sessionDir).toContain(cacheDir);
    });

    it('should have global logs dir as parent of agent logs dir', () => {
      const logsDir = getGlobalLogsDir();
      const agentLogsDir = getGlobalAgentLogsDir();
      expect(agentLogsDir).toContain(logsDir);
    });
  });

  describe('Cross-platform compatibility', () => {
    it('should use path.join for proper platform path separators', () => {
      const dir = getGlobalConfigDir();
      expect(typeof dir).toBe('string');
      expect(dir.length).toBeGreaterThan(0);
    });

    it('should work with homedir from os module', () => {
      const dir = getGlobalConfigDir();
      const expectedHomedir = homedir();
      expect(dir).toContain(expectedHomedir);
    });

    it('should use process.cwd for project directory', () => {
      const dir = getProjectConfigDir();
      expect(dir).toContain(process.cwd());
    });
  });

  describe('Path structure', () => {
    it('should have .mindmux as base directory name for both global and project', () => {
      const globalDir = getGlobalConfigDir();
      const projectDir = getProjectConfigDir();

      expect(globalDir.endsWith('.mindmux')).toBe(true);
      expect(projectDir.endsWith('.mindmux')).toBe(true);
    });

    it('should use consistent naming patterns', () => {
      const configPath = getGlobalConfigPath();
      const agentsPath = getGlobalAgentsPath();
      const metadataPath = getGlobalMetadataPath();

      expect(configPath.endsWith('config.json')).toBe(true);
      expect(agentsPath.endsWith('agents.json')).toBe(true);
      expect(metadataPath.endsWith('metadata.json')).toBe(true);
    });

    it('should have logs subdirectory structure', () => {
      const logsDir = getGlobalLogsDir();
      const agentLogsDir = getGlobalAgentLogsDir();

      expect(logsDir.includes('logs')).toBe(true);
      expect(agentLogsDir.includes('logs')).toBe(true);
      expect(agentLogsDir.includes('agents')).toBe(true);
    });

    it('should have cache subdirectory structure', () => {
      const cacheDir = getGlobalCacheDir();
      const sessionDir = getGlobalSessionCacheDir();

      expect(cacheDir.includes('cache')).toBe(true);
      expect(sessionDir.includes('cache')).toBe(true);
      expect(sessionDir.includes('sessions')).toBe(true);
    });
  });

  describe('Path consistency', () => {
    it('global paths should all use homedir', () => {
      const homeDirPath = homedir();

      expect(getGlobalConfigDir()).toContain(homeDirPath);
      expect(getGlobalConfigPath()).toContain(homeDirPath);
      expect(getGlobalAgentsPath()).toContain(homeDirPath);
      expect(getGlobalMetadataPath()).toContain(homeDirPath);
      expect(getGlobalLogsDir()).toContain(homeDirPath);
      expect(getGlobalAgentLogsDir()).toContain(homeDirPath);
      expect(getGlobalCacheDir()).toContain(homeDirPath);
      expect(getGlobalSessionCacheDir()).toContain(homeDirPath);
    });

    it('project paths should all use process.cwd', () => {
      const cwdPath = process.cwd();
      expect(getProjectConfigDir()).toContain(cwdPath);
    });
  });
});
