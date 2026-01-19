/**
 * Persistence Manager
 * Initializes SQLite database and all repositories
 */

import Database from 'better-sqlite3';
import { getDatabase } from '../db/sqlite-connection.js';
import { SqliteSchemaManager } from '../db/sqlite-schema-manager.js';
import { StateCache } from '../cache/state-cache.js';
import { AgentRepository } from './agent-repository.js';
import { TaskRepository } from './task-repository.js';
import { SessionRepository } from './session-repository.js';
import { AuditLogger } from './audit-logger.js';

export interface PersistenceServices {
  db: Database.Database;
  cache: StateCache;
  agentRepository: AgentRepository;
  taskRepository: TaskRepository;
  sessionRepository: SessionRepository;
  auditLogger: AuditLogger;
}

/**
 * Initialize persistence layer with SQLite
 */
export function initializePersistence(): PersistenceServices {
  try {
    // Get database instance
    const db = getDatabase();

    // Initialize schema
    const schemaManager = new SqliteSchemaManager(db);
    schemaManager.initializeSchema();

    if (!schemaManager.isUpToDate()) {
      console.warn('Schema version mismatch - may need migration');
    }

    // Create cache and rebuild from database
    const cache = new StateCache(db);
    cache.rebuildFromDb();

    // Create repositories
    const auditLogger = new AuditLogger(db);
    const agentRepository = new AgentRepository(db, cache, auditLogger);
    const taskRepository = new TaskRepository(db, cache, auditLogger);
    const sessionRepository = new SessionRepository(db, cache, auditLogger);

    console.log('Persistence layer initialized successfully');

    return {
      db,
      cache,
      agentRepository,
      taskRepository,
      sessionRepository,
      auditLogger,
    };
  } catch (error) {
    throw new Error(
      `Failed to initialize persistence: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Gracefully shutdown persistence
 */
export function shutdownPersistence(services: PersistenceServices): void {
  try {
    // Close database connection
    services.db.close();
    console.log('Persistence layer shut down successfully');
  } catch (error) {
    console.error(
      'Error during persistence shutdown:',
      error instanceof Error ? error.message : String(error)
    );
  }
}
