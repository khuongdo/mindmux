/**
 * Tests for Rate Limiter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from './rate-limiter.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ maxRequests: 10, windowMs: 1000 });
  });

  describe('checkLimit', () => {
    it('should allow requests within limit', () => {
      const result = limiter.checkLimit('client-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(10);
    });

    it('should track remaining tokens', () => {
      const result1 = limiter.checkLimit('client-1');
      const result2 = limiter.checkLimit('client-1');

      expect(result1.remaining).toBeGreaterThan(result2.remaining);
    });

    it('should eventually reject requests over limit', () => {
      for (let i = 0; i < 10; i++) {
        const result = limiter.checkLimit('client-1');
        expect(result.allowed).toBe(true);
      }

      const rejected = limiter.checkLimit('client-1');
      expect(rejected.allowed).toBe(false);
      expect(rejected.remaining).toBe(0);
    });

    it('should isolate clients', () => {
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('client-1');
      }

      const result = limiter.checkLimit('client-2');
      expect(result.allowed).toBe(true);
    });

    it('should provide reset time', () => {
      const result = limiter.checkLimit('client-1');
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe('reset', () => {
    it('should reset bucket for identifier', () => {
      limiter.checkLimit('client-1');
      limiter.checkLimit('client-1');

      limiter.reset('client-1');

      const result = limiter.checkLimit('client-1');
      expect(result.remaining).toBe(9); // One consumed after reset
    });
  });

  describe('clear', () => {
    it('should clear all buckets', () => {
      limiter.checkLimit('client-1');
      limiter.checkLimit('client-2');

      limiter.clear();

      const result1 = limiter.checkLimit('client-1');
      const result2 = limiter.checkLimit('client-2');

      expect(result1.remaining).toBeLessThanOrEqual(10);
      expect(result2.remaining).toBeLessThanOrEqual(10);
    });
  });

  describe('getStatus', () => {
    it('should return status without consuming token', () => {
      const status1 = limiter.getStatus('client-1');
      const status2 = limiter.getStatus('client-1');

      expect(status1.remaining).toBe(status2.remaining);
    });

    it('should reflect consumed tokens', () => {
      limiter.checkLimit('client-1');
      limiter.checkLimit('client-1');

      const status = limiter.getStatus('client-1');
      expect(status.remaining).toBeLessThanOrEqual(8);
    });
  });

  describe('getConfig', () => {
    it('should return config', () => {
      const config = limiter.getConfig();
      expect(config.maxRequests).toBe(10);
      expect(config.windowMs).toBe(1000);
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      limiter.checkLimit('client-1');
      limiter.checkLimit('client-2');
      limiter.checkLimit('client-3');

      const stats = limiter.getStats();
      expect(stats.activeIdentifiers).toBe(3);
      expect(stats.totalBuckets).toBe(3);
    });
  });

  describe('token refill', () => {
    it('should refill tokens over time', () => {
      const limiter2 = new RateLimiter({ maxRequests: 5, windowMs: 100 });

      // Use all tokens
      for (let i = 0; i < 5; i++) {
        limiter2.checkLimit('client-1');
      }

      const rejected1 = limiter2.checkLimit('client-1');
      expect(rejected1.allowed).toBe(false);

      // Wait for partial refill
      return new Promise(resolve => {
        setTimeout(() => {
          const refilled = limiter2.checkLimit('client-1');
          expect(refilled.allowed).toBe(true);
          resolve(undefined);
        }, 50);
      });
    });
  });
});
