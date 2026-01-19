-- MindMux SQLite Schema
-- Version 1 - Initial schema

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('claude', 'gemini', 'gpt4', 'opencode')),
  capabilities TEXT NOT NULL,
  config TEXT NOT NULL,
  status TEXT DEFAULT 'idle' CHECK(status IN ('idle', 'busy', 'error', 'terminated')),
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  required_capabilities TEXT NOT NULL,
  priority INTEGER DEFAULT 50,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'queued', 'assigned', 'running', 'completed', 'failed', 'cancelled')),
  assigned_agent_id TEXT REFERENCES agents(id),
  depends_on TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  started_at INTEGER,
  completed_at INTEGER,
  result TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  timeout_ms INTEGER DEFAULT 3600000
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  tmux_session TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'attached', 'detached', 'terminated')),
  started_at INTEGER DEFAULT (strftime('%s','now')),
  ended_at INTEGER,
  process_id INTEGER
);

-- Audit log table (immutable, event sourcing)
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER DEFAULT (strftime('%s','now')),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  changes TEXT,
  actor TEXT DEFAULT 'cli'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent ON tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
