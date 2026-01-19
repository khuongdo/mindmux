/**
 * Auth Middleware
 * Extracts and validates authentication tokens from CLI context
 */

import { getAuthManager } from '../security/auth-manager.js';
import { ErrorHandler } from '../security/error-handler.js';

export interface AuthContext {
  token?: string;
  userId?: string;
  role?: 'admin' | 'operator' | 'viewer';
  isAuthenticated: boolean;
}

export class AuthMiddleware {
  /**
   * Extract token from environment or context
   */
  static extractToken(context?: Record<string, unknown>): string | null {
    // Check context first
    if (context?.token && typeof context.token === 'string') {
      return context.token;
    }

    // Check environment variable
    const envToken = process.env.MINDMUX_AUTH_TOKEN;
    if (envToken) {
      return envToken;
    }

    return null;
  }

  /**
   * Validate token and create auth context
   */
  static validateToken(token: string | null): AuthContext {
    if (!token) {
      return {
        isAuthenticated: false,
      };
    }

    try {
      const authManager = getAuthManager();
      const session = authManager.validateSession(token);

      if (!session) {
        return {
          isAuthenticated: false,
        };
      }

      return {
        token,
        userId: session.userId,
        role: session.role,
        isAuthenticated: true,
      };
    } catch (error) {
      ErrorHandler.logError(error as Error, { action: 'auth:validate' });
      return {
        isAuthenticated: false,
      };
    }
  }

  /**
   * Require authentication
   */
  static requireAuth(context: AuthContext): void {
    if (!context.isAuthenticated) {
      throw new Error('Authentication required. Please log in first.');
    }
  }

  /**
   * Extract auth context from environment/options
   */
  static extractAuthContext(options?: Record<string, unknown>): AuthContext {
    const token = this.extractToken(options);
    return this.validateToken(token);
  }

  /**
   * Create mock auth context for testing
   */
  static createMockAuthContext(userId: string, role: 'admin' | 'operator' | 'viewer' = 'operator'): AuthContext {
    return {
      token: 'mock-token',
      userId,
      role,
      isAuthenticated: true,
    };
  }
}
