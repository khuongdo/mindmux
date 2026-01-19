/**
 * PostgreSQL Connection Pool Manager
 * Handles connection pooling and graceful shutdown
 */

import { Pool, PoolClient, QueryResult } from 'pg';

export interface PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class ConnectionPool {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor(config: PoolConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      this.isConnected = false;
    });
  }

  /**
   * Test database connection
   */
  async connect(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Check if pool is connected
   */
  isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Execute a query
   */
  async query<T = any>(
    text: string,
    values?: any[]
  ): Promise<QueryResult<T>> {
    if (!this.isConnected && !await this.connect()) {
      throw new Error('Database connection unavailable');
    }
    return this.pool.query(text, values);
  }

  /**
   * Execute a query with a single row result
   */
  async queryOne<T = any>(
    text: string,
    values?: any[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Gracefully close all connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

/**
 * Singleton instance
 */
let poolInstance: ConnectionPool | null = null;

export function initializePool(config: PoolConfig): ConnectionPool {
  if (!poolInstance) {
    poolInstance = new ConnectionPool(config);
  }
  return poolInstance;
}

export function getPool(): ConnectionPool {
  if (!poolInstance) {
    throw new Error('Connection pool not initialized');
  }
  return poolInstance;
}

export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.close();
    poolInstance = null;
  }
}
