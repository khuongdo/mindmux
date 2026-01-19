/**
 * Core type definitions for MindMux CLI
 */

// Agent types supported by MindMux
export type AgentType = 'claude' | 'gemini' | 'gpt4' | 'opencode';

// Agent status
export type AgentStatus = 'idle' | 'busy' | 'error' | 'terminated';

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
  updatedAt?: string;              // ISO 8601 timestamp
  lastActivity?: string;           // ISO 8601 timestamp
  config: AgentConfig;             // Provider-specific config
  sessionName?: string;            // Tmux session name
  pid?: number;                    // Process ID
  isRunning?: boolean;             // Session active?
}

// Metadata tracking
export interface MindMuxMetadata {
  version: string;
  installedAt: string;             // ISO 8601 timestamp
  lastUpdated: string;             // ISO 8601 timestamp
  userId: string;                  // Auto-generated UUID
}

// Task status enum
export type TaskStatus =
  | 'pending'     // Created, waiting for dependencies
  | 'queued'      // Ready, in queue waiting for agent
  | 'assigned'    // Agent selected, about to run
  | 'running'     // Currently executing
  | 'completed'   // Finished successfully
  | 'failed'      // Failed after retries exhausted
  | 'cancelled';  // Cancelled by user

// Task definition
export interface Task {
  id: string;                      // UUID v4
  prompt: string;                  // Task prompt/instruction
  status: TaskStatus;              // Current status
  priority: number;                // 0-100, higher = urgent
  requiredCapabilities: string[];  // Agent must have ALL
  dependsOn?: string[];            // Prerequisite task IDs
  assignedAgentId?: string;        // Assigned agent ID (primary)
  agentId?: string;                // Legacy: Assigned agent ID (alias for assignedAgentId)
  createdAt: string;               // ISO 8601 timestamp
  queuedAt?: string;               // When added to queue
  assignedAt?: string;             // When agent assigned
  startedAt?: string;              // When execution began
  completedAt?: string;            // When finished
  result?: string;                 // Output on success
  errorMessage?: string;           // Error message on failure (primary)
  error?: string;                  // Legacy: Error message (alias for errorMessage)
  retryCount: number;              // Current retry (0-based)
  maxRetries: number;              // Max attempts (default 3)
  timeout: number;                 // Timeout in ms
}

// Task creation options
export interface CreateTaskOptions {
  prompt: string;
  priority?: number;
  requiredCapabilities?: string[];
  dependsOn?: string[];
  timeout?: number;
  maxRetries?: number;
}

// Session status enum
export type SessionStatus = 'active' | 'attached' | 'detached' | 'terminated';

// Session definition (tmux session tracking)
export interface Session {
  id: string;                        // UUID v4
  agentId: string;                   // Associated agent
  tmuxSession: string;               // Tmux session name
  status: SessionStatus;             // Current status
  startedAt: string;                 // ISO 8601 timestamp
  endedAt?: string;                  // ISO 8601 timestamp
  processId?: number;                // Process ID
}

// Agents storage structure
export interface AgentsStore {
  agents: Agent[];
}
