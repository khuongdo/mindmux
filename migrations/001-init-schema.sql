-- MindMux Database Schema
-- Version 1.0 - Initial schema setup

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('claude', 'gemini', 'gpt4', 'opencode')),
  capabilities TEXT[] NOT NULL,
  config JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'idle' CHECK (status IN ('idle', 'busy', 'unhealthy')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  last_activity TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  required_capabilities TEXT[] NOT NULL,
  priority INT DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'assigned', 'running', 'completed', 'failed', 'cancelled')),
  assigned_agent_id UUID REFERENCES agents(id),
  depends_on UUID[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  queued_at TIMESTAMP,
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  result TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  timeout_ms INT DEFAULT 3600000
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tmux_session VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'attached', 'detached', 'terminated')),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  process_id INT
);

-- Audit log table (immutable)
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  event_type VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id UUID,
  changes JSONB,
  actor VARCHAR(255)
);

-- Task events table (event sourcing)
CREATE TABLE IF NOT EXISTS task_events (
  id BIGSERIAL PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event_type VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_agents_name ON agents(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_agents_status ON agents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_agent ON tasks(assigned_agent_id);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX idx_sessions_active ON sessions(status) WHERE status IN ('active', 'attached');
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_task_events_task_id ON task_events(task_id);
CREATE INDEX idx_task_events_timestamp ON task_events(timestamp DESC);

-- Create schema version table for migrations
CREATE TABLE IF NOT EXISTS schema_version (
  id SERIAL PRIMARY KEY,
  version INT NOT NULL UNIQUE,
  description VARCHAR(255),
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert this migration as applied
INSERT INTO schema_version (version, description)
VALUES (1, 'Initial schema setup with agents, tasks, sessions, audit log, and event sourcing')
ON CONFLICT (version) DO NOTHING;

-- Set timezone to UTC for all timestamps
ALTER DATABASE postgres SET timezone TO 'UTC';
