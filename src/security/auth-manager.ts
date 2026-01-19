/**
 * Authentication Manager
 * Handles session token generation, validation, and TTL management
 * Stores sessions with Redis (or in-memory for CLI usage)
 */

import { randomUUID } from 'crypto';

export interface AuthSession {
  token: string;
  userId: string;
  role: 'admin' | 'operator' | 'viewer';
  createdAt: number;
  expiresAt: number;
  metadata?: Record<string, unknown>;
}

export class AuthManager {
  private static readonly DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private sessions: Map<string, AuthSession> = new Map();

  /**
   * Create new session token
   */
  createSession(userId: string, role: 'admin' | 'operator' | 'viewer' = 'operator', ttlMs?: number): AuthSession {
    const token = randomUUID();
    const now = Date.now();
    const ttl = ttlMs || AuthManager.DEFAULT_TTL_MS;

    const session: AuthSession = {
      token,
      userId,
      role,
      createdAt: now,
      expiresAt: now + ttl,
    };

    this.sessions.set(token, session);
    this.cleanupExpiredSessions();

    return session;
  }

  /**
   * Validate session token
   */
  validateSession(token: string): AuthSession | null {
    const session = this.sessions.get(token);

    if (!session) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  /**
   * Get session by token
   */
  getSession(token: string): AuthSession | null {
    return this.validateSession(token);
  }

  /**
   * Revoke session token
   */
  revokeSession(token: string): boolean {
    return this.sessions.delete(token);
  }

  /**
   * Get all active sessions for user
   */
  getUserSessions(userId: string): AuthSession[] {
    const now = Date.now();
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId && s.expiresAt > now);
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expired: string[] = [];

    this.sessions.forEach((session, token) => {
      if (session.expiresAt <= now) {
        expired.push(token);
      }
    });

    expired.forEach(token => this.sessions.delete(token));
  }

  /**
   * Extend session TTL
   */
  extendSession(token: string, additionalTtlMs?: number): AuthSession | null {
    const session = this.validateSession(token);
    if (!session) return null;

    const ttl = additionalTtlMs || AuthManager.DEFAULT_TTL_MS;
    session.expiresAt = Date.now() + ttl;

    this.sessions.set(token, session);
    return session;
  }

  /**
   * Get session statistics
   */
  getStats(): { totalSessions: number; activeSessions: number } {
    const now = Date.now();
    let activeSessions = 0;

    this.sessions.forEach(session => {
      if (session.expiresAt > now) {
        activeSessions++;
      }
    });

    return {
      totalSessions: this.sessions.size,
      activeSessions,
    };
  }
}

// Singleton instance for CLI
let authManagerInstance: AuthManager | null = null;

export function getAuthManager(): AuthManager {
  if (!authManagerInstance) {
    authManagerInstance = new AuthManager();
  }
  return authManagerInstance;
}

export function resetAuthManager(): void {
  authManagerInstance = null;
}
