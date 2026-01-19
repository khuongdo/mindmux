/**
 * Database Schema Manager
 * Handles migrations and schema versioning
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ConnectionPool } from './connection-pool.js';

export interface SchemaVersion {
  version: number;
  description: string;
  appliedAt: string;
}

export class SchemaManager {
  constructor(private pool: ConnectionPool) {}

  /**
   * Get current schema version
   */
  async getCurrentVersion(): Promise<number> {
    try {
      const result = await this.pool.queryOne<{ max: number }>(
        'SELECT MAX(version) as max FROM schema_version'
      );
      return result?.max || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get all applied migrations
   */
  async getAppliedMigrations(): Promise<SchemaVersion[]> {
    try {
      const result = await this.pool.query<SchemaVersion>(
        'SELECT version, description, applied_at as "appliedAt" FROM schema_version ORDER BY version'
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<{ applied: number; failed: boolean }> {
    const currentVersion = await this.getCurrentVersion();
    let applied = 0;
    let failed = false;

    // List of migrations to run in order
    const migrations = [
      {
        version: 1,
        file: '001-init-schema.sql',
        description: 'Initial schema setup',
      },
    ];

    for (const migration of migrations) {
      if (migration.version <= currentVersion) {
        console.log(`Migration ${migration.version} already applied`);
        continue;
      }

      try {
        console.log(`Applying migration ${migration.version}: ${migration.description}`);

        const migrationPath = resolve(
          process.cwd(),
          `migrations/${migration.file}`
        );
        const sql = readFileSync(migrationPath, 'utf8');

        // Execute migration in transaction
        await this.pool.transaction(async (client) => {
          // Split SQL by statements and execute each
          const statements = sql
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !s.startsWith('--'));

          for (const statement of statements) {
            if (statement.includes('schema_version')) {
              // Skip version table creation/insertion for individual statements
              continue;
            }
            await client.query(statement);
          }

          // Record migration completion
          await client.query(
            'INSERT INTO schema_version (version, description) VALUES ($1, $2)',
            [migration.version, migration.description]
          );
        });

        console.log(`Migration ${migration.version} applied successfully`);
        applied++;
      } catch (error) {
        console.error(
          `Migration ${migration.version} failed:`,
          error instanceof Error ? error.message : error
        );
        failed = true;
      }
    }

    return { applied, failed };
  }

  /**
   * Rollback to a specific version (careful!)
   */
  async rollbackTo(version: number): Promise<boolean> {
    try {
      console.warn(`Rolling back to schema version ${version}`);

      // In a real implementation, you would have down migrations
      // For now, this is a placeholder
      await this.pool.query('DELETE FROM schema_version WHERE version > $1', [
        version,
      ]);

      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * Reset database (DANGEROUS - dev only)
   */
  async reset(): Promise<boolean> {
    try {
      // Drop all tables in reverse order of creation
      await this.pool.transaction(async (client) => {
        await client.query('DROP TABLE IF EXISTS task_events CASCADE');
        await client.query('DROP TABLE IF EXISTS audit_log CASCADE');
        await client.query('DROP TABLE IF EXISTS sessions CASCADE');
        await client.query('DROP TABLE IF EXISTS tasks CASCADE');
        await client.query('DROP TABLE IF EXISTS agents CASCADE');
        await client.query('DROP TABLE IF EXISTS schema_version CASCADE');
      });

      // Re-run migrations
      await this.migrate();
      return true;
    } catch (error) {
      console.error('Reset failed:', error);
      return false;
    }
  }

  /**
   * Check schema health
   */
  async checkHealth(): Promise<{
    isHealthy: boolean;
    version: number;
    tables: string[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const tables: string[] = [];

    try {
      const version = await this.getCurrentVersion();

      // Check required tables
      const requiredTables = [
        'agents',
        'tasks',
        'sessions',
        'audit_log',
        'task_events',
        'schema_version',
      ];

      for (const table of requiredTables) {
        try {
          await this.pool.query(
            `SELECT 1 FROM information_schema.tables WHERE table_name = $1`,
            [table]
          );
          tables.push(table);
        } catch {
          errors.push(`Table ${table} not found`);
        }
      }

      return {
        isHealthy: errors.length === 0,
        version,
        tables,
        errors,
      };
    } catch (error) {
      return {
        isHealthy: false,
        version: 0,
        tables: [],
        errors: [
          error instanceof Error ? error.message : 'Unknown error',
        ],
      };
    }
  }
}

export async function initializeSchema(pool: ConnectionPool): Promise<SchemaManager> {
  const manager = new SchemaManager(pool);

  // Run migrations on initialization
  const result = await manager.migrate();

  if (result.failed) {
    console.error('Schema migration failed');
  } else if (result.applied > 0) {
    console.log(`${result.applied} migration(s) applied`);
  }

  return manager;
}
