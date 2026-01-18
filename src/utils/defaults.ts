/**
 * Default configuration values for MindMux
 */

import { MindMuxConfig } from '../core/types.js';

export const DEFAULT_CONFIG: MindMuxConfig = {
  version: '0.1.0',
  defaultAgentType: 'claude',
  defaultModel: {
    claude: 'claude-opus-4-5-20250929',
    gemini: 'gemini-2-5-flash',
    gpt4: 'gpt-4-turbo',
    opencode: 'opencode-latest',
  },
  timeout: 3600000, // 1 hour in milliseconds
  maxConcurrentAgents: 10,
  logging: {
    level: 'info',
    enableAgentLogs: true,
    maxLogSizeMB: 100,
  },
  tmux: {
    sessionPrefix: 'mindmux',
    keepSessionsAlive: true,
  },
};

// Valid agent capabilities
export const VALID_CAPABILITIES = [
  'code-generation',
  'code-review',
  'debugging',
  'testing',
  'documentation',
  'planning',
  'research',
  'refactoring',
] as const;

export type ValidCapability = typeof VALID_CAPABILITIES[number];
