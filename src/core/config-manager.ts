/**
 * Configuration manager with hierarchy support
 * Implements config merging: project-local > global > defaults
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { DEFAULT_CONFIG } from '../utils/defaults';
import {
  getGlobalConfigDir,
  getGlobalConfigPath,
  getGlobalAgentsPath,
  getGlobalMetadataPath,
  getGlobalLogsDir,
  getGlobalAgentLogsDir,
  getGlobalCacheDir,
  getGlobalSessionCacheDir,
  getProjectConfigPath,
  hasProjectConfig,
} from '../utils/paths';
import { MindMuxConfig, MindMuxMetadata } from './types';
import { atomicWriteJSON, safeReadJSON } from '../utils/file-operations';
import {
  validateMindMuxConfig,
  validateMindMuxMetadata,
  safeValidate,
} from '../utils/json-validator';

export class ConfigManager {
  private config: MindMuxConfig;

  constructor() {
    this.ensureConfigDirs();
    this.config = this.loadMergedConfig();
  }

  /**
   * Ensure all config directories exist
   */
  private ensureConfigDirs(): void {
    const globalDir = getGlobalConfigDir();

    if (!existsSync(globalDir)) {
      // Create main directory
      mkdirSync(globalDir, { recursive: true });

      // Create subdirectories
      mkdirSync(getGlobalLogsDir(), { recursive: true });
      mkdirSync(getGlobalAgentLogsDir(), { recursive: true });
      mkdirSync(getGlobalCacheDir(), { recursive: true });
      mkdirSync(getGlobalSessionCacheDir(), { recursive: true });

      // Create .gitignore
      const gitignoreContent = [
        'cache/',
        'logs/',
        '*.log',
        'sessions/',
      ].join('\n');

      writeFileSync(
        join(globalDir, '.gitignore'),
        gitignoreContent
      );
    }

    // Always ensure config files exist (even if dir already exists)
    this.initializeGlobalConfig();
  }

  /**
   * Initialize global config files with defaults
   */
  private initializeGlobalConfig(): void {
    const configPath = getGlobalConfigPath();
    const agentsPath = getGlobalAgentsPath();
    const metadataPath = getGlobalMetadataPath();

    if (!existsSync(configPath)) {
      atomicWriteJSON(configPath, DEFAULT_CONFIG);
    }

    if (!existsSync(agentsPath)) {
      atomicWriteJSON(agentsPath, { agents: [] });
    }

    if (!existsSync(metadataPath)) {
      const metadata: MindMuxMetadata = {
        version: '0.1.0',
        installedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        userId: randomUUID(),
      };
      atomicWriteJSON(metadataPath, metadata);
    }
  }

  /**
   * Load and merge configs with hierarchy
   * Priority: project-local > global > defaults
   */
  private loadMergedConfig(): MindMuxConfig {
    const globalConfig = this.loadGlobalConfig();
    const projectConfig = this.loadProjectConfig();

    // Deep merge with proper type handling
    return {
      ...DEFAULT_CONFIG,
      ...globalConfig,
      ...projectConfig,
      defaultModel: {
        ...DEFAULT_CONFIG.defaultModel,
        ...(globalConfig?.defaultModel || {}),
        ...(projectConfig?.defaultModel || {}),
      },
      logging: {
        ...DEFAULT_CONFIG.logging,
        ...(globalConfig?.logging || {}),
        ...(projectConfig?.logging || {}),
      },
      tmux: {
        ...DEFAULT_CONFIG.tmux,
        ...(globalConfig?.tmux || {}),
        ...(projectConfig?.tmux || {}),
      },
    };
  }

  /**
   * Load global config file
   */
  private loadGlobalConfig(): Partial<MindMuxConfig> | null {
    const path = getGlobalConfigPath();
    if (!existsSync(path)) return null;

    try {
      const data = safeReadJSON<Partial<MindMuxConfig>>(path);
      if (!data) return null;

      // Partial validation - only validate if full config structure present
      if (this.isFullConfig(data)) {
        return safeValidate(data, validateMindMuxConfig, path);
      }

      return data;
    } catch (error) {
      console.error(`Error reading global config: ${error}`);
      throw new Error(
        `Corrupted global config at ${path}. Please check or delete the file.`
      );
    }
  }

  /**
   * Check if config object is a full MindMuxConfig
   */
  private isFullConfig(config: Partial<MindMuxConfig>): boolean {
    return !!(
      config.version &&
      config.defaultAgentType &&
      config.defaultModel &&
      config.timeout !== undefined &&
      config.maxConcurrentAgents !== undefined &&
      config.logging &&
      config.tmux
    );
  }

  /**
   * Load project-local config file
   */
  private loadProjectConfig(): Partial<MindMuxConfig> | null {
    if (!hasProjectConfig()) return null;

    const path = getProjectConfigPath();
    if (!path || !existsSync(path)) return null;

    try {
      const data = safeReadJSON<Partial<MindMuxConfig>>(path);
      if (!data) return null;

      // Partial validation - only validate if full config structure present
      if (this.isFullConfig(data)) {
        return safeValidate(data, validateMindMuxConfig, path);
      }

      return data;
    } catch (error) {
      console.error(`Error reading project config: ${error}`);
      throw new Error(
        `Corrupted project config at ${path}. Please check or delete the file.`
      );
    }
  }

  /**
   * Get final merged config
   */
  getConfig(): MindMuxConfig {
    return this.config;
  }

  /**
   * Update global config
   */
  updateGlobalConfig(updates: Partial<MindMuxConfig>): void {
    const current = this.loadGlobalConfig() || {};
    const updated = { ...current, ...updates };

    atomicWriteJSON(getGlobalConfigPath(), updated);

    // Reload merged config
    this.config = this.loadMergedConfig();
  }

  /**
   * Get metadata
   */
  getMetadata(): MindMuxMetadata | null {
    const path = getGlobalMetadataPath();
    if (!existsSync(path)) return null;

    try {
      const data = safeReadJSON<MindMuxMetadata>(path);
      if (!data) return null;

      return safeValidate(data, validateMindMuxMetadata, path);
    } catch (error) {
      console.error(`Error reading metadata: ${error}`);
      throw new Error(
        `Corrupted metadata at ${path}. Please check or delete the file.`
      );
    }
  }

  /**
   * Update metadata
   */
  updateMetadata(updates: Partial<MindMuxMetadata>): void {
    const current = this.getMetadata() || {
      version: '0.1.0',
      installedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      userId: randomUUID(),
    };

    const updated = {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    atomicWriteJSON(getGlobalMetadataPath(), updated);
  }
}
