/**
 * Session Repository
 * CRUD operations for session tracking
 */

import Database from 'better-sqlite3';
import { Session, SessionStatus } from '../core/types.js';
import { StateCache } from '../cache/state-cache.js';
import { AuditLogger } from './audit-logger.js';

export class SessionRepository {
  constructor(
    private db: Database.Database,
    private cache: StateCache,
    private auditLogger: AuditLogger
  ) {}

  /**
   * Get session by ID
   */
  get(id: string): Session | null {
    const session = this.cache.getSession(id);
    return session || null;
  }

  /**
   * Get all sessions
   */
  getAll(): Session[] {
    return this.cache.getAllSessions();
  }

  /**
   * Create new session
   */
  create(session: Session): Session {
    try {
      const now = Math.floor(Date.now() / 1000);
      const stmt = this.db.prepare(`
        INSERT INTO sessions (id, agent_id, tmux_session, status, started_at, process_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        session.id,
        session.agentId,
        session.tmuxSession,
        session.status,
        now,
        session.processId || null
      );

      // Add to cache
      this.cache.setSession(session.id, session);

      // Log event
      this.auditLogger.log('session:created', 'session', session.id, {
        before: null,
        after: session,
      });

      return session;
    } catch (error) {
      throw new Error(
        `Failed to create session: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update session status
   */
  updateStatus(id: string, status: SessionStatus): Session | null {
    try {
      const existing = this.get(id);
      if (!existing) {
        return null;
      }

      const updated: Session = { ...existing, status } as Session;

      const stmt = this.db.prepare(`
        UPDATE sessions SET status = ? WHERE id = ?
      `);

      stmt.run(status, id);

      // Update cache
      this.cache.setSession(id, updated);

      // Log event
      this.auditLogger.log('session:updated', 'session', id, {
        before: existing,
        after: updated,
      });

      return updated;
    } catch (error) {
      throw new Error(
        `Failed to update session status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * End session
   */
  end(id: string): Session | null {
    try {
      const existing = this.get(id);
      if (!existing) {
        return null;
      }

      const now = Math.floor(Date.now() / 1000);
      const updated: Session = {
        ...existing,
        status: 'terminated' as const,
        endedAt: new Date(now * 1000).toISOString(),
      };

      const stmt = this.db.prepare(`
        UPDATE sessions SET status = ?, ended_at = ? WHERE id = ?
      `);

      stmt.run('terminated', now, id);

      // Update cache
      this.cache.setSession(id, updated);

      // Log event
      this.auditLogger.log('session:ended', 'session', id, {
        before: existing,
        after: updated,
      });

      return updated;
    } catch (error) {
      throw new Error(
        `Failed to end session: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete session
   */
  delete(id: string): boolean {
    try {
      const existing = this.get(id);
      if (!existing) {
        return false;
      }

      const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
      stmt.run(id);

      // Remove from cache
      this.cache.deleteSession(id);

      // Log event
      this.auditLogger.log('session:deleted', 'session', id, {
        before: existing,
        after: null,
      });

      return true;
    } catch (error) {
      throw new Error(
        `Failed to delete session: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get sessions for agent
   */
  getByAgentId(agentId: string): Session[] {
    return this.cache.getSessionsByAgentId(agentId);
  }

  /**
   * Find orphaned sessions (no running process)
   */
  findOrphaned(): Session[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM sessions
        WHERE status IN ('active', 'attached', 'detached')
        AND ended_at IS NULL
      `);

      const results = stmt.all() as Array<{
        id: string;
        agent_id: string;
        tmux_session: string;
        status: string;
        started_at: number;
        ended_at: number | null;
        process_id: number | null;
      }>;

      return results.map(row => ({
        id: row.id,
        agentId: row.agent_id,
        tmuxSession: row.tmux_session,
        status: row.status as any,
        startedAt: new Date(row.started_at * 1000).toISOString(),
        endedAt: row.ended_at ? new Date(row.ended_at * 1000).toISOString() : undefined,
        processId: row.process_id || undefined,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get active sessions
   */
  getActive(): Session[] {
    return this.getAll().filter(s => s.status !== 'terminated' && !s.endedAt);
  }

  /**
   * Get session count
   */
  count(): number {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM sessions');
      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error) {
      return 0;
    }
  }
}
