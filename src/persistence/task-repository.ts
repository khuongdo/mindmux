/**
 * Task Repository
 * CRUD operations with SQLite persistence and in-memory cache
 */

import Database from 'better-sqlite3';
import { Task } from '../core/types.js';
import { StateCache } from '../cache/state-cache.js';
import { AuditLogger } from './audit-logger.js';

export class TaskRepository {
  constructor(
    private db: Database.Database,
    private cache: StateCache,
    private auditLogger: AuditLogger
  ) {}

  /**
   * Get task by ID
   */
  get(id: string): Task | null {
    const task = this.cache.getTask(id);
    return task || null;
  }

  /**
   * Get all tasks
   */
  getAll(): Task[] {
    return this.cache.getAllTasks();
  }

  /**
   * Create new task
   */
  create(task: Task): Task {
    try {
      const now = Math.floor(Date.now() / 1000);
      const stmt = this.db.prepare(`
        INSERT INTO tasks (
          id, prompt, required_capabilities, priority, status,
          assigned_agent_id, depends_on, created_at, retry_count,
          max_retries, timeout_ms
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        task.id,
        task.prompt,
        JSON.stringify(task.requiredCapabilities),
        task.priority,
        task.status,
        task.assignedAgentId || null,
        task.dependsOn ? JSON.stringify(task.dependsOn) : null,
        now,
        task.retryCount,
        task.maxRetries,
        task.timeout
      );

      // Add to cache
      this.cache.setTask(task.id, task);

      // Log event
      this.auditLogger.log('task:created', 'task', task.id, {
        before: null,
        after: task,
      });

      return task;
    } catch (error) {
      throw new Error(
        `Failed to create task: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update task
   */
  update(id: string, updates: Partial<Task>): Task | null {
    try {
      const existing = this.get(id);
      if (!existing) {
        return null;
      }

      const updated: Task = { ...existing, ...updates };
      const now = Math.floor(Date.now() / 1000);

      const stmt = this.db.prepare(`
        UPDATE tasks
        SET prompt = ?, required_capabilities = ?, priority = ?, status = ?,
            assigned_agent_id = ?, depends_on = ?, started_at = ?,
            completed_at = ?, result = ?, error_message = ?,
            retry_count = ?, max_retries = ?, timeout_ms = ?
        WHERE id = ?
      `);

      const changes = {
        before: existing,
        after: updated,
      };

      const startedAtTs = updated.startedAt ? Math.floor(new Date(updated.startedAt).getTime() / 1000) : null;
      const completedAtTs = updated.completedAt ? Math.floor(new Date(updated.completedAt).getTime() / 1000) : null;

      stmt.run(
        updated.prompt,
        JSON.stringify(updated.requiredCapabilities),
        updated.priority,
        updated.status,
        updated.assignedAgentId || null,
        updated.dependsOn ? JSON.stringify(updated.dependsOn) : null,
        startedAtTs,
        completedAtTs,
        updated.result || null,
        updated.errorMessage || null,
        updated.retryCount,
        updated.maxRetries,
        updated.timeout,
        id
      );

      // Update cache
      this.cache.setTask(id, updated);

      // Log event
      this.auditLogger.log('task:updated', 'task', id, changes);

      return updated;
    } catch (error) {
      throw new Error(
        `Failed to update task: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete task
   */
  delete(id: string): boolean {
    try {
      const existing = this.get(id);
      if (!existing) {
        return false;
      }

      const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
      stmt.run(id);

      // Remove from cache
      this.cache.deleteTask(id);

      // Log event
      this.auditLogger.log('task:deleted', 'task', id, {
        before: existing,
        after: null,
      });

      return true;
    } catch (error) {
      throw new Error(
        `Failed to delete task: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get tasks by status
   */
  getByStatus(status: string): Task[] {
    return this.cache.getTasksByStatus(status);
  }

  /**
   * Get task queue (pending + queued tasks sorted by priority)
   */
  getQueue(): Task[] {
    const statuses = ['pending', 'queued'];
    return this.getAll()
      .filter(t => statuses.includes(t.status))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get tasks assigned to agent
   */
  getByAgentId(agentId: string): Task[] {
    return this.getAll().filter(t => t.assignedAgentId === agentId);
  }

  /**
   * Get incomplete tasks (for recovery on startup)
   */
  getIncomplete(): Task[] {
    const incompleteStatuses = ['pending', 'queued', 'assigned', 'running'];
    return this.getAll().filter(t => incompleteStatuses.includes(t.status));
  }

  /**
   * Get task count
   */
  count(): number {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM tasks');
      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get count by status
   */
  countByStatus(status: string): number {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = ?');
      const result = stmt.get(status) as { count: number };
      return result.count;
    } catch (error) {
      return 0;
    }
  }
}
