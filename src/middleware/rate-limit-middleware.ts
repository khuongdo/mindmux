/**
 * Rate Limit Middleware
 * Enforces rate limiting for API requests
 */

import { getApiRateLimiter } from '../security/rate-limiter.js';
import { getAuditService } from '../security/audit-service.js';

export interface RateLimitContext {
  identifier: string; // IP address or user ID
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export class RateLimitMiddleware {
  /**
   * Check rate limit for identifier
   */
  static checkLimit(identifier: string): RateLimitContext {
    const limiter = getApiRateLimiter();
    const status = limiter.checkLimit(identifier);

    return {
      identifier,
      allowed: status.allowed,
      remaining: status.remaining,
      resetTime: status.resetTime,
    };
  }

  /**
   * Get rate limit status without consuming
   */
  static getStatus(identifier: string): RateLimitContext {
    const limiter = getApiRateLimiter();
    const status = limiter.getStatus(identifier);

    return {
      identifier,
      allowed: status.allowed,
      remaining: status.remaining,
      resetTime: status.resetTime,
    };
  }

  /**
   * Reset rate limit for identifier
   */
  static reset(identifier: string): void {
    const limiter = getApiRateLimiter();
    limiter.reset(identifier);
  }

  /**
   * Check limit and log audit entry on rejection
   */
  static checkLimitWithAudit(identifier: string, userId?: string): RateLimitContext {
    const status = this.checkLimit(identifier);

    if (!status.allowed && userId) {
      try {
        const auditService = getAuditService();
        auditService.log(userId, 'auth:failed', identifier, 'ratelimit', 'failure', {
          details: { reason: 'rate_limit_exceeded' },
        });
      } catch (error) {
        // Silently ignore audit failures
      }
    }

    return status;
  }

  /**
   * Format rate limit error message
   */
  static formatErrorMessage(context: RateLimitContext): string {
    const resetDate = new Date(context.resetTime);
    return `Rate limit exceeded. Try again after ${resetDate.toISOString()}`;
  }

  /**
   * Format rate limit headers
   */
  static formatHeaders(context: RateLimitContext): Record<string, string> {
    return {
      'X-RateLimit-Remaining': String(context.remaining),
      'X-RateLimit-Reset': String(Math.ceil(context.resetTime / 1000)),
    };
  }
}
