/**
 * Core types for MindMux v2
 */

export type AITool = 'claude' | 'gemini' | 'opencode' | 'cursor' | 'aider' | 'codex' | 'unknown';

export type SessionStatus = 'running' | 'waiting' | 'idle' | 'error' | 'unknown';

export interface AISession {
  // Unique identifier (tmux pane ID)
  id: string;

  // Session metadata
  sessionName: string;    // tmux session name
  paneId: string;         // tmux pane ID
  windowId: string;       // tmux window ID

  // AI tool info
  toolType: AITool;       // Detected AI tool
  processName: string;    // Actual process name

  // Project context
  projectPath: string;    // Working directory
  label?: string;         // User-defined label

  // Status
  status: SessionStatus;  // Current state
  lastUpdated: Date;      // Last status check

  // MCP configuration
  activeMCPs: string[];   // Enabled MCP servers
}

export interface MCPServer {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  scope: 'global' | 'local';  // Global = all sessions, Local = per-project
}

export interface SessionLabel {
  sessionId: string;
  label: string;
  createdAt: Date;
  activeMCPs?: string[];  // Optional: active MCP servers for session persistence
}

export interface Config {
  mcpServers: Record<string, MCPServer>;
  labels: SessionLabel[];
}
