/**
 * Redis Client Manager
 * Handles Redis connection, caching, and pub/sub operations
 */

import { createClient, RedisClient, RedisClientType } from 'redis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryStrategy?: (retries: number) => number | null;
}

export class RedisManager {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  async connect(config: RedisConfig): Promise<boolean> {
    try {
      this.client = createClient({
        host: config.host,
        port: config.port,
        password: config.password,
        database: config.db || 0,
      }) as any;

      this.client.on('error', (err) => {
        console.error('Redis error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        this.isConnected = false;
      });

      await this.client.connect?.();
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Redis connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Check if Redis is healthy
   */
  isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Set a value with optional TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');

    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    if (ttlSeconds) {
      await this.client.setEx(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  /**
   * Get a value
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client) throw new Error('Redis not connected');

    const value = await this.client.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.del(key);
  }

  /**
   * Delete multiple keys
   */
  async delMulti(keys: string[]): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    if (keys.length === 0) return 0;
    return this.client.del(keys);
  }

  /**
   * Set expiration time
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.client) throw new Error('Redis not connected');
    const result = await this.client.expire(key, ttlSeconds);
    return result === 1;
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.ttl(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client) throw new Error('Redis not connected');
    return (await this.client.exists(key)) === 1;
  }

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.zAdd(key, { score, value: member });
  }

  /**
   * Get sorted set range
   */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.zRange(key, start, stop);
  }

  /**
   * Remove from sorted set
   */
  async zrem(key: string, member: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.zRem(key, member);
  }

  /**
   * Get sorted set size
   */
  async zcard(key: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.zCard(key);
  }

  /**
   * Add to set
   */
  async sadd(key: string, member: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.sAdd(key, member);
  }

  /**
   * Get set members
   */
  async smembers(key: string): Promise<string[]> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.sMembers(key);
  }

  /**
   * Remove from set
   */
  async srem(key: string, member: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.sRem(key, member);
  }

  /**
   * Check set membership
   */
  async sismember(key: string, member: string): Promise<boolean> {
    if (!this.client) throw new Error('Redis not connected');
    return (await this.client.sIsMember(key, member)) === 1;
  }

  /**
   * Publish message
   */
  async publish(channel: string, message: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.publish(channel, message);
  }

  /**
   * Invalidate cache keys matching pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');

    const keys = await this.client.keys(pattern);
    if (keys.length === 0) return 0;

    return this.delMulti(keys);
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.keys(pattern);
  }

  /**
   * Clear all data
   */
  async flushAll(): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');
    await this.client.flushAll();
  }

  /**
   * Get Redis info
   */
  async info(): Promise<string> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.info?.() || 'N/A';
  }

  /**
   * Close connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect?.();
      this.isConnected = false;
    }
  }
}

/**
 * Singleton instance
 */
let redisInstance: RedisManager | null = null;

export async function initializeRedis(config: RedisConfig): Promise<RedisManager> {
  if (!redisInstance) {
    redisInstance = new RedisManager();
    await redisInstance.connect(config);
  }
  return redisInstance;
}

export function getRedis(): RedisManager {
  if (!redisInstance) {
    throw new Error('Redis not initialized');
  }
  return redisInstance;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.disconnect();
    redisInstance = null;
  }
}
