/**
 * Tests for Auth Manager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuthManager, resetAuthManager, getAuthManager } from './auth-manager.js';

describe('AuthManager', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    authManager = new AuthManager();
    resetAuthManager();
  });

  describe('createSession', () => {
    it('should create session with default role', () => {
      const session = authManager.createSession('user-123');

      expect(session.token).toBeDefined();
      expect(session.userId).toBe('user-123');
      expect(session.role).toBe('operator');
      expect(session.createdAt).toBeGreaterThan(0);
      expect(session.expiresAt).toBeGreaterThan(session.createdAt);
    });

    it('should create session with custom role', () => {
      const session = authManager.createSession('user-123', 'admin');

      expect(session.role).toBe('admin');
    });

    it('should create session with custom TTL', () => {
      const ttl = 60000;
      const session = authManager.createSession('user-123', 'operator', ttl);

      expect(session.expiresAt - session.createdAt).toBe(ttl);
    });

    it('should generate unique tokens', () => {
      const session1 = authManager.createSession('user-1');
      const session2 = authManager.createSession('user-2');

      expect(session1.token).not.toBe(session2.token);
    });
  });

  describe('validateSession', () => {
    it('should validate active session', () => {
      const session = authManager.createSession('user-123');
      const validated = authManager.validateSession(session.token);

      expect(validated).not.toBeNull();
      expect(validated!.userId).toBe('user-123');
    });

    it('should return null for non-existent token', () => {
      const validated = authManager.validateSession('invalid-token');
      expect(validated).toBeNull();
    });

    it('should return null for expired session', () => {
      const session = authManager.createSession('user-123', 'operator', 1); // 1ms TTL

      // Wait for expiration
      return new Promise(resolve => {
        setTimeout(() => {
          const validated = authManager.validateSession(session.token);
          expect(validated).toBeNull();
          resolve(undefined);
        }, 10);
      });
    });
  });

  describe('revokeSession', () => {
    it('should revoke session', () => {
      const session = authManager.createSession('user-123');
      const revoked = authManager.revokeSession(session.token);

      expect(revoked).toBe(true);
      expect(authManager.validateSession(session.token)).toBeNull();
    });

    it('should return false for non-existent token', () => {
      const revoked = authManager.revokeSession('invalid-token');
      expect(revoked).toBe(false);
    });
  });

  describe('getUserSessions', () => {
    it('should get all user sessions', () => {
      authManager.createSession('user-123');
      authManager.createSession('user-123');
      authManager.createSession('user-456');

      const userSessions = authManager.getUserSessions('user-123');
      expect(userSessions).toHaveLength(2);
      expect(userSessions.every(s => s.userId === 'user-123')).toBe(true);
    });

    it('should not include expired sessions', () => {
      const session1 = authManager.createSession('user-123');
      const session2 = authManager.createSession('user-123', 'operator', 1);

      return new Promise(resolve => {
        setTimeout(() => {
          const userSessions = authManager.getUserSessions('user-123');
          expect(userSessions).toHaveLength(1);
          expect(userSessions[0].token).toBe(session1.token);
          resolve(undefined);
        }, 10);
      });
    });
  });

  describe('extendSession', () => {
    it('should extend session TTL', () => {
      const session = authManager.createSession('user-123', 'operator', 1000);
      const oldExpiry = session.expiresAt;

      // Small delay to ensure time passes
      return new Promise(resolve => {
        setTimeout(() => {
          const extended = authManager.extendSession(session.token, 10000);

          expect(extended).not.toBeNull();
          expect(extended!.expiresAt).toBeGreaterThan(oldExpiry);
          resolve(undefined);
        }, 10);
      });
    });

    it('should return null for invalid token', () => {
      const extended = authManager.extendSession('invalid-token');
      expect(extended).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return stats', () => {
      authManager.createSession('user-123');
      authManager.createSession('user-456');

      const stats = authManager.getStats();

      expect(stats.totalSessions).toBeGreaterThanOrEqual(2);
      expect(stats.activeSessions).toBeGreaterThanOrEqual(2);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const manager1 = getAuthManager();
      const manager2 = getAuthManager();

      expect(manager1).toBe(manager2);
    });

    it('should reset singleton', () => {
      const manager1 = getAuthManager();
      manager1.createSession('user-123');

      resetAuthManager();
      const manager2 = getAuthManager();

      expect(manager1).not.toBe(manager2);
    });
  });
});
