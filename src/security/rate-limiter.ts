/**
 * Rate Limiter
 * Token bucket algorithm for rate limiting
 * Prevents brute force and DoS attacks
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
  }

  /**
   * Check if request is allowed for identifier (IP, user, etc.)
   */
  checkLimit(identifier: string): RateLimitStatus {
    const now = Date.now();
    let bucket = this.buckets.get(identifier);

    if (!bucket) {
      bucket = {
        tokens: this.maxRequests,
        lastRefill: now,
      };
      this.buckets.set(identifier, bucket);
    }

    // Refill tokens based on time elapsed
    const timeSinceLastRefill = now - bucket.lastRefill;
    const refillRate = this.maxRequests / this.windowMs;
    const tokensToAdd = timeSinceLastRefill * refillRate;

    bucket.tokens = Math.min(this.maxRequests, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    const allowed = bucket.tokens >= 1;

    if (allowed) {
      bucket.tokens -= 1;
    }

    const remaining = Math.floor(bucket.tokens);
    const resetTime = now + (this.windowMs - timeSinceLastRefill);

    return {
      allowed,
      remaining: Math.max(0, remaining),
      resetTime,
    };
  }

  /**
   * Reset bucket for identifier
   */
  reset(identifier: string): void {
    this.buckets.delete(identifier);
  }

  /**
   * Clear all buckets
   */
  clear(): void {
    this.buckets.clear();
  }

  /**
   * Get bucket status without consuming token
   */
  getStatus(identifier: string): RateLimitStatus {
    const now = Date.now();
    let bucket = this.buckets.get(identifier);

    if (!bucket) {
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: now + this.windowMs,
      };
    }

    const timeSinceLastRefill = now - bucket.lastRefill;
    const refillRate = this.maxRequests / this.windowMs;
    const tokensToAdd = timeSinceLastRefill * refillRate;
    const currentTokens = Math.min(this.maxRequests, bucket.tokens + tokensToAdd);

    return {
      allowed: currentTokens >= 1,
      remaining: Math.floor(currentTokens),
      resetTime: now + (this.windowMs - timeSinceLastRefill),
    };
  }

  /**
   * Get config
   */
  getConfig(): RateLimitConfig {
    return {
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
    };
  }

  /**
   * Get statistics
   */
  getStats(): { activeIdentifiers: number; totalBuckets: number } {
    return {
      activeIdentifiers: this.buckets.size,
      totalBuckets: this.buckets.size,
    };
  }
}

// Singleton instances for CLI and API
let cliRateLimiter: RateLimiter | null = null;
let apiRateLimiter: RateLimiter | null = null;

export function getCliRateLimiter(): RateLimiter {
  if (!cliRateLimiter) {
    cliRateLimiter = new RateLimiter({ maxRequests: 1000, windowMs: 60000 });
  }
  return cliRateLimiter;
}

export function getApiRateLimiter(): RateLimiter {
  if (!apiRateLimiter) {
    apiRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
  }
  return apiRateLimiter;
}
