/**
 * Core type definitions for MindMux CLI
 */

// Agent types supported by MindMux
export type AgentType = 'claude' | 'gemini' | 'gpt4' | 'opencode';

// Agent status
export type AgentStatus = 'idle' | 'busy' | 'unhealthy';

// Logging configuration
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableAgentLogs: boolean;
  maxLogSizeMB: number;
}

// Tmux configuration
export interface TmuxConfig {
  sessionPrefix: string;
  keepSessionsAlive: boolean;
}

// Global MindMux configuration
export interface MindMuxConfig {
  version: string;
  defaultAgentType: AgentType;
  defaultModel: Record<AgentType, string>;
  timeout: number;
  maxConcurrentAgents: number;
  logging: LoggingConfig;
  tmux: TmuxConfig;
}

// Agent-specific configuration
export interface AgentConfig {
  model?: string;
  maxConcurrentTasks?: number;
  timeout?: number;
}

// Agent definition
export interface Agent {
  id: string;                      // UUID v4
  name: string;                    // User-friendly name
  type: AgentType;                 // Provider type
  capabilities: string[];          // List of capabilities
  status: AgentStatus;             // Current status
  createdAt: string;               // ISO 8601 timestamp
  lastActivity?: string;           // ISO 8601 timestamp
  config: AgentConfig;             // Provider-specific config
}

// Metadata tracking
export interface MindMuxMetadata {
  version: string;
  installedAt: string;             // ISO 8601 timestamp
  lastUpdated: string;             // ISO 8601 timestamp
  userId: string;                  // Auto-generated UUID
}

// Agents storage structure
export interface AgentsStore {
  agents: Agent[];
}
