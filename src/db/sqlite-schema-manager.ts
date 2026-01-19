/**
 * SQLite Schema Manager
 * Handles schema initialization and migrations for SQLite
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCHEMA_VERSION = 1;

export class SqliteSchemaManager {
  constructor(private db: Database.Database) {}

  /**
   * Initialize schema - create tables if they don't exist
   */
  initializeSchema(): void {
    try {
      // Check if schema_version table exists
      const hasSchemaVersion = this.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
        )
        .get();

      if (!hasSchemaVersion) {
        // Read schema file and execute
        const schemaPath = join(__dirname, 'schema.sql');
        const schema = readFileSync(schemaPath, 'utf-8');

        // Execute schema as single transaction
        this.db.exec(schema);

        // Record schema version
        this.db
          .prepare('INSERT INTO schema_version (version) VALUES (?)')
          .run(SCHEMA_VERSION);
      }
    } catch (error) {
      throw new Error(
        `Failed to initialize schema: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get current schema version
   */
  getVersion(): number {
    try {
      const result = this.db
        .prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1')
        .get() as { version: number } | undefined;

      return result?.version ?? 0;
    } catch (error) {
      // Schema not initialized yet
      return 0;
    }
  }

  /**
   * Check if schema is up to date
   */
  isUpToDate(): boolean {
    return this.getVersion() === SCHEMA_VERSION;
  }

  /**
   * Get target schema version
   */
  static getTargetVersion(): number {
    return SCHEMA_VERSION;
  }

  /**
   * Validate schema structure
   */
  validateSchema(): boolean {
    try {
      const requiredTables = [
        'schema_version',
        'agents',
        'tasks',
        'sessions',
        'audit_log',
      ];

      for (const table of requiredTables) {
        const result = this.db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
          )
          .get(table);

        if (!result) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}
