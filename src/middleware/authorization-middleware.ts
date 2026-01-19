/**
 * Authorization Middleware
 * Enforces RBAC policies before operations
 */

import { Authorization, AuthorizationError, PermissionContext, OperationAction } from '../security/authorization.js';
import { ErrorHandler } from '../security/error-handler.js';
import { getAuditService } from '../security/audit-service.js';
import { AuthContext } from './auth-middleware.js';

export class AuthorizationMiddleware {
  /**
   * Check permission and throw if denied
   */
  static checkPermission(
    authContext: AuthContext,
    action: OperationAction,
    resource?: { id: string; owner?: string }
  ): void {
    if (!authContext.isAuthenticated || !authContext.userId || !authContext.role) {
      throw new AuthorizationError('Authentication required');
    }

    const context: PermissionContext = {
      user: {
        userId: authContext.userId,
        role: authContext.role,
      },
      action,
      resource,
    };

    try {
      Authorization.requirePermission(context);
      this.logPermissionGranted(authContext.userId, action, resource?.id);
    } catch (error) {
      this.logPermissionDenied(authContext.userId, action, resource?.id);
      throw error;
    }
  }

  /**
   * Check if permission is allowed (doesn't throw)
   */
  static isAllowed(
    authContext: AuthContext,
    action: OperationAction,
    resource?: { id: string; owner?: string }
  ): boolean {
    if (!authContext.isAuthenticated || !authContext.userId || !authContext.role) {
      return false;
    }

    const context: PermissionContext = {
      user: {
        userId: authContext.userId,
        role: authContext.role,
      },
      action,
      resource,
    };

    return Authorization.canPerform(context);
  }

  /**
   * Get permissions for role
   */
  static getPermissions(role: 'admin' | 'operator' | 'viewer'): OperationAction[] {
    return Authorization.getPermissions(role);
  }

  /**
   * Log permission granted
   */
  private static logPermissionGranted(userId: string, action: OperationAction, resource?: string): void {
    try {
      const auditService = getAuditService();
      // Map OperationAction to AuditAction if needed
      const auditAction = action as any;
      auditService.log(userId, auditAction, resource || 'system', 'permission', 'success');
    } catch (error) {
      ErrorHandler.logError(error as Error, { action: 'audit:log', resource });
    }
  }

  /**
   * Log permission denied
   */
  private static logPermissionDenied(userId: string, action: OperationAction, resource?: string): void {
    try {
      const auditService = getAuditService();
      auditService.log(userId, 'permission:denied', resource || 'system', 'permission', 'failure', {
        details: { action, deniedAt: new Date().toISOString() },
      });
    } catch (error) {
      ErrorHandler.logError(error as Error, { action: 'audit:log', resource });
    }
  }

  /**
   * Require admin role
   */
  static requireAdmin(authContext: AuthContext): void {
    if (!authContext.isAuthenticated || authContext.role !== 'admin') {
      throw new AuthorizationError('Admin role required');
    }
  }

  /**
   * Require operator or admin role
   */
  static requireOperator(authContext: AuthContext): void {
    if (!authContext.isAuthenticated || (authContext.role !== 'operator' && authContext.role !== 'admin')) {
      throw new AuthorizationError('Operator role required');
    }
  }

  /**
   * Require authenticated user (any role)
   */
  static requireAuth(authContext: AuthContext): void {
    if (!authContext.isAuthenticated) {
      throw new AuthorizationError('Authentication required');
    }
  }
}
