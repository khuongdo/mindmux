/**
 * Authorization Manager
 * Implements RBAC (Role-Based Access Control)
 * Checks permissions for operations based on user role and resource ownership
 */

export type UserRole = 'admin' | 'operator' | 'viewer';

export type OperationAction =
  | 'agent:create'
  | 'agent:list'
  | 'agent:read'
  | 'agent:delete'
  | 'agent:start'
  | 'agent:stop'
  | 'task:queue'
  | 'task:list'
  | 'task:read'
  | 'task:cancel'
  | 'session:attach'
  | 'session:logs'
  | 'audit:read'
  | 'key:rotate'
  | 'config:read'
  | 'config:write';

export interface AuthUser {
  userId: string;
  role: UserRole;
  ownedResources?: string[]; // Agent IDs or other resource IDs owned by user
}

export interface PermissionContext {
  user: AuthUser;
  action: OperationAction;
  resource?: {
    id: string;
    owner?: string;
  };
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class Authorization {
  /**
   * RBAC permission matrix
   */
  private static readonly PERMISSIONS: Record<UserRole, OperationAction[]> = {
    admin: [
      'agent:create',
      'agent:list',
      'agent:read',
      'agent:delete',
      'agent:start',
      'agent:stop',
      'task:queue',
      'task:list',
      'task:read',
      'task:cancel',
      'session:attach',
      'session:logs',
      'audit:read',
      'key:rotate',
      'config:read',
      'config:write',
    ],
    operator: [
      'agent:create',
      'agent:list',
      'agent:read',
      'agent:start',
      'task:queue',
      'task:list',
      'task:read',
      'task:cancel',
      'session:attach',
      'session:logs',
      'config:read',
    ],
    viewer: [
      'agent:list',
      'agent:read',
      'task:list',
      'task:read',
      'session:logs',
      'config:read',
    ],
  };

  /**
   * Actions that require resource ownership
   */
  private static readonly OWNERSHIP_REQUIRED: OperationAction[] = [
    'agent:delete',
    'agent:stop',
    'task:cancel',
  ];

  /**
   * Check if user has permission for action
   */
  static canPerform(context: PermissionContext): boolean {
    const { user, action, resource } = context;

    // Check basic role permission
    const permissions = this.PERMISSIONS[user.role];
    if (!permissions.includes(action)) {
      return false;
    }

    // Check resource ownership if required
    if (Authorization.OWNERSHIP_REQUIRED.includes(action)) {
      return this.checkResourceOwnership(user, resource);
    }

    return true;
  }

  /**
   * Verify permission or throw error
   */
  static requirePermission(context: PermissionContext): void {
    if (!this.canPerform(context)) {
      throw new AuthorizationError(
        `User ${context.user.userId} (${context.user.role}) cannot perform ${context.action}`
      );
    }
  }

  /**
   * Check resource ownership
   */
  private static checkResourceOwnership(user: AuthUser, resource?: { id: string; owner?: string }): boolean {
    if (!resource) return false;

    // Admin always has access
    if (user.role === 'admin') {
      return true;
    }

    // Check if user owns the resource
    if (resource.owner && resource.owner === user.userId) {
      return true;
    }

    // Check in ownedResources list
    if (user.ownedResources && user.ownedResources.includes(resource.id)) {
      return true;
    }

    return false;
  }

  /**
   * Get permissions for role
   */
  static getPermissions(role: UserRole): OperationAction[] {
    return this.PERMISSIONS[role] || [];
  }

  /**
   * Get default role for new users
   */
  static getDefaultRole(): UserRole {
    return 'operator';
  }

  /**
   * Validate role
   */
  static isValidRole(role: string): role is UserRole {
    return ['admin', 'operator', 'viewer'].includes(role);
  }
}
