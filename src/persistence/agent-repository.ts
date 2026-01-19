/**
 * Agent Repository
 * CRUD operations with SQLite persistence and in-memory cache
 */

import Database from 'better-sqlite3';
import { Agent } from '../core/types.js';
import { StateCache } from '../cache/state-cache.js';
import { AuditLogger } from './audit-logger.js';

export class AgentRepository {
  constructor(
    private db: Database.Database,
    private cache: StateCache,
    private auditLogger: AuditLogger
  ) {}

  /**
   * Get agent by ID from cache (O(1))
   */
  get(id: string): Agent | null {
    const agent = this.cache.getAgent(id);
    return agent || null;
  }

  /**
   * Get all agents from cache
   */
  getAll(): Agent[] {
    return this.cache.getAllAgents();
  }

  /**
   * Create new agent (write-through)
   */
  create(agent: Agent): Agent {
    try {
      const now = Math.floor(Date.now() / 1000);
      const stmt = this.db.prepare(`
        INSERT INTO agents (id, name, type, capabilities, config, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        agent.id,
        agent.name,
        agent.type,
        JSON.stringify(agent.capabilities),
        JSON.stringify(agent.config),
        agent.status,
        now,
        now
      );

      // Add to cache
      this.cache.setAgent(agent.id, agent);

      // Log event
      this.auditLogger.log('agent:created', 'agent', agent.id, {
        before: null,
        after: agent,
      });

      return agent;
    } catch (error) {
      throw new Error(
        `Failed to create agent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update agent (write-through)
   */
  update(id: string, updates: Partial<Agent>): Agent | null {
    try {
      const existing = this.get(id);
      if (!existing) {
        return null;
      }

      const updated: Agent = { ...existing, ...updates };
      const now = Math.floor(Date.now() / 1000);

      const stmt = this.db.prepare(`
        UPDATE agents
        SET name = ?, type = ?, capabilities = ?, config = ?, status = ?, updated_at = ?
        WHERE id = ?
      `);

      const changes = {
        before: existing,
        after: updated,
      };

      stmt.run(
        updated.name,
        updated.type,
        JSON.stringify(updated.capabilities),
        JSON.stringify(updated.config),
        updated.status,
        now,
        id
      );

      // Update cache
      this.cache.setAgent(id, updated);

      // Log event
      this.auditLogger.log('agent:updated', 'agent', id, changes);

      return updated;
    } catch (error) {
      throw new Error(
        `Failed to update agent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete agent
   */
  delete(id: string): boolean {
    try {
      const existing = this.get(id);
      if (!existing) {
        return false;
      }

      const stmt = this.db.prepare('DELETE FROM agents WHERE id = ?');
      stmt.run(id);

      // Remove from cache
      this.cache.deleteAgent(id);

      // Log event
      this.auditLogger.log('agent:deleted', 'agent', id, {
        before: existing,
        after: null,
      });

      return true;
    } catch (error) {
      throw new Error(
        `Failed to delete agent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get agent by name
   */
  getByName(name: string): Agent | null {
    try {
      const stmt = this.db.prepare('SELECT id FROM agents WHERE name = ? LIMIT 1');
      const result = stmt.get(name) as { id: string } | undefined;

      if (result) {
        return this.get(result.id);
      }

      return null;
    } catch (error) {
      throw new Error(
        `Failed to get agent by name: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get agents by status
   */
  getByStatus(status: string): Agent[] {
    return this.getAll().filter(agent => agent.status === status);
  }

  /**
   * Get agents count
   */
  count(): number {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM agents');
      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error) {
      return 0;
    }
  }
}
