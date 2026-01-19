/**
 * In-Memory State Cache
 * Provides fast access to hot state (agents, tasks, sessions)
 * Rebuilt from SQLite on startup
 */

import Database from 'better-sqlite3';
import { Agent, Task, Session } from '../core/types.js';

export interface CacheState {
  agents: Map<string, Agent>;
  tasks: Map<string, Task>;
  sessions: Map<string, Session>;
}

export class StateCache {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private sessions: Map<string, Session> = new Map();

  constructor(private db: Database.Database) {}

  /**
   * Rebuild cache from SQLite database
   */
  rebuildFromDb(): void {
    try {
      // Clear existing cache
      this.agents.clear();
      this.tasks.clear();
      this.sessions.clear();

      // Load agents from SQLite
      const agentsResult = this.db
        .prepare('SELECT * FROM agents')
        .all() as Array<{
        id: string;
        name: string;
        type: string;
        capabilities: string;
        config: string;
        status: string;
        created_at: number;
        updated_at: number;
      }>;

      for (const row of agentsResult) {
        const agent: Agent = {
          id: row.id,
          name: row.name,
          type: row.type as any,
          capabilities: JSON.parse(row.capabilities),
          config: JSON.parse(row.config),
          status: row.status as any,
          createdAt: new Date(row.created_at * 1000).toISOString(),
        };
        this.agents.set(row.id, agent);
      }

      // Load tasks from SQLite
      const tasksResult = this.db
        .prepare('SELECT * FROM tasks')
        .all() as Array<{
        id: string;
        prompt: string;
        required_capabilities: string;
        priority: number;
        status: string;
        assigned_agent_id: string | null;
        depends_on: string | null;
        created_at: number;
        started_at: number | null;
        completed_at: number | null;
        result: string | null;
        error_message: string | null;
        retry_count: number;
        max_retries: number;
        timeout_ms: number;
      }>;

      for (const row of tasksResult) {
        const task: Task = {
          id: row.id,
          prompt: row.prompt,
          requiredCapabilities: JSON.parse(row.required_capabilities),
          priority: row.priority,
          status: row.status as any,
          assignedAgentId: row.assigned_agent_id || undefined,
          dependsOn: row.depends_on ? JSON.parse(row.depends_on) : undefined,
          createdAt: new Date(row.created_at * 1000).toISOString(),
          startedAt: row.started_at ? new Date(row.started_at * 1000).toISOString() : undefined,
          completedAt: row.completed_at
            ? new Date(row.completed_at * 1000).toISOString()
            : undefined,
          result: row.result || undefined,
          errorMessage: row.error_message || undefined,
          retryCount: row.retry_count,
          maxRetries: row.max_retries,
          timeout: row.timeout_ms,
        };
        // Fix task property mapping for existing code compatibility
        (task as any).agentId = row.assigned_agent_id || undefined;
        (task as any).error = row.error_message || undefined;
        this.tasks.set(row.id, task);
      }

      // Load sessions from SQLite
      const sessionsResult = this.db
        .prepare('SELECT * FROM sessions')
        .all() as Array<{
        id: string;
        agent_id: string;
        tmux_session: string;
        status: string;
        started_at: number;
        ended_at: number | null;
        process_id: number | null;
      }>;

      for (const row of sessionsResult) {
        const session: Session = {
          id: row.id,
          agentId: row.agent_id,
          tmuxSession: row.tmux_session,
          status: row.status as any,
          startedAt: new Date(row.started_at * 1000).toISOString(),
          endedAt: row.ended_at ? new Date(row.ended_at * 1000).toISOString() : undefined,
          processId: row.process_id || undefined,
        };
        this.sessions.set(row.id, session);
      }
    } catch (error) {
      console.error(
        'Failed to rebuild cache:',
        error instanceof Error ? error.message : String(error)
      );
      // Continue with empty cache
    }
  }

  // Agents cache
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  setAgent(id: string, agent: Agent): void {
    this.agents.set(id, agent);
  }

  deleteAgent(id: string): boolean {
    return this.agents.delete(id);
  }

  // Tasks cache
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTasksByStatus(status: string): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === status);
  }

  setTask(id: string, task: Task): void {
    this.tasks.set(id, task);
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  // Sessions cache
  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  getSessionsByAgentId(agentId: string): Session[] {
    return Array.from(this.sessions.values()).filter(s => s.agentId === agentId);
  }

  setSession(id: string, session: Session): void {
    this.sessions.set(id, session);
  }

  deleteSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  /**
   * Get cache state snapshot
   */
  getState(): CacheState {
    return {
      agents: new Map(this.agents),
      tasks: new Map(this.tasks),
      sessions: new Map(this.sessions),
    };
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.agents.clear();
    this.tasks.clear();
    this.sessions.clear();
  }
}
