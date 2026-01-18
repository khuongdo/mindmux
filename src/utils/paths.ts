/**
 * Cross-platform path utilities for MindMux configuration
 */

import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

// Global config directory
export function getGlobalConfigDir(): string {
  return join(homedir(), '.mindmux');
}

// Project-local config directory
export function getProjectConfigDir(): string {
  return join(process.cwd(), '.mindmux');
}

// Check if project has local config
export function hasProjectConfig(): boolean {
  return existsSync(getProjectConfigDir());
}

// Global config file paths
export function getGlobalConfigPath(): string {
  return join(getGlobalConfigDir(), 'config.json');
}

export function getGlobalAgentsPath(): string {
  return join(getGlobalConfigDir(), 'agents.json');
}

export function getGlobalMetadataPath(): string {
  return join(getGlobalConfigDir(), 'metadata.json');
}

export function getGlobalLogsDir(): string {
  return join(getGlobalConfigDir(), 'logs');
}

export function getGlobalAgentLogsDir(): string {
  return join(getGlobalLogsDir(), 'agents');
}

export function getGlobalCacheDir(): string {
  return join(getGlobalConfigDir(), 'cache');
}

export function getGlobalSessionCacheDir(): string {
  return join(getGlobalCacheDir(), 'sessions');
}

// Project-local config paths (returns null if not exists)
export function getProjectConfigPath(): string | null {
  if (!hasProjectConfig()) return null;
  return join(getProjectConfigDir(), 'config.json');
}

export function getProjectAgentsPath(): string | null {
  if (!hasProjectConfig()) return null;
  return join(getProjectConfigDir(), 'agents.json');
}
