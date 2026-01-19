/**
 * SQLite Database Connection Singleton
 * Manages single persistent connection to SQLite database
 */

import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync } from 'fs';

let dbInstance: Database.Database | null = null;

/**
 * Get or initialize SQLite database connection
 * Database location: ~/.mindmux/data.db
 */
export function getDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  // Ensure ~/.mindmux directory exists
  const mindmuxDir = join(homedir(), '.mindmux');
  mkdirSync(mindmuxDir, { recursive: true, mode: 0o700 });

  // Open database with WAL mode for better concurrency
  const dbPath = join(mindmuxDir, 'data.db');
  dbInstance = new Database(dbPath);

  // Enable WAL mode
  dbInstance.pragma('journal_mode = WAL');

  // Set reasonable timeout
  dbInstance.pragma('busy_timeout = 5000');

  // Enable foreign keys
  dbInstance.pragma('foreign_keys = ON');

  return dbInstance;
}

/**
 * Close database connection (cleanup)
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Reset database instance (for testing)
 */
export function resetDatabaseInstance(): void {
  if (dbInstance) {
    dbInstance.close();
  }
  dbInstance = null;
}
