/**
 * Audit Logger
 * Immutable event sourcing for state changes
 */

import Database from 'better-sqlite3';

export interface AuditEntry {
  id: number;
  timestamp: number;
  eventType: string;
  entityType: string;
  entityId: string;
  changes: Record<string, any>;
  actor: string;
}

export class AuditLogger {
  constructor(private db: Database.Database) {}

  /**
   * Log an audit entry
   */
  log(
    eventType: string,
    entityType: string,
    entityId: string,
    changes: Record<string, any>,
    actor: string = 'cli'
  ): number {
    try {
      const now = Math.floor(Date.now() / 1000);
      const stmt = this.db.prepare(`
        INSERT INTO audit_log (timestamp, event_type, entity_type, entity_id, changes, actor)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        now,
        eventType,
        entityType,
        entityId,
        JSON.stringify(changes),
        actor
      );

      return info.lastInsertRowid as number;
    } catch (error) {
      console.error(
        'Failed to log audit entry:',
        error instanceof Error ? error.message : String(error)
      );
      return -1;
    }
  }

  /**
   * Get audit history for entity
   */
  getHistory(entityType: string, entityId: string, limit: number = 100): AuditEntry[] {
    try {
      const stmt = this.db.prepare(`
        SELECT id, timestamp, event_type, entity_type, entity_id, changes, actor
        FROM audit_log
        WHERE entity_type = ? AND entity_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      const results = stmt.all(entityType, entityId, limit) as Array<{
        id: number;
        timestamp: number;
        event_type: string;
        entity_type: string;
        entity_id: string;
        changes: string;
        actor: string;
      }>;

      return results.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        eventType: row.event_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        changes: JSON.parse(row.changes),
        actor: row.actor,
      }));
    } catch (error) {
      console.error(
        'Failed to get audit history:',
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Get audit entries by event type
   */
  getByEventType(eventType: string, limit: number = 100): AuditEntry[] {
    try {
      const stmt = this.db.prepare(`
        SELECT id, timestamp, event_type, entity_type, entity_id, changes, actor
        FROM audit_log
        WHERE event_type = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      const results = stmt.all(eventType, limit) as Array<{
        id: number;
        timestamp: number;
        event_type: string;
        entity_type: string;
        entity_id: string;
        changes: string;
        actor: string;
      }>;

      return results.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        eventType: row.event_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        changes: JSON.parse(row.changes),
        actor: row.actor,
      }));
    } catch (error) {
      console.error(
        'Failed to get audit entries:',
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Get recent audit entries
   */
  getRecent(limit: number = 100): AuditEntry[] {
    try {
      const stmt = this.db.prepare(`
        SELECT id, timestamp, event_type, entity_type, entity_id, changes, actor
        FROM audit_log
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      const results = stmt.all(limit) as Array<{
        id: number;
        timestamp: number;
        event_type: string;
        entity_type: string;
        entity_id: string;
        changes: string;
        actor: string;
      }>;

      return results.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        eventType: row.event_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        changes: JSON.parse(row.changes),
        actor: row.actor,
      }));
    } catch (error) {
      console.error(
        'Failed to get recent audit entries:',
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Count audit entries
   */
  count(): number {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM audit_log');
      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error) {
      return 0;
    }
  }
}
