/**
 * Tests for Authorization
 */

import { describe, it, expect } from 'vitest';
import { Authorization, AuthorizationError } from './authorization.js';

describe('Authorization', () => {
  describe('canPerform', () => {
    it('admin should have all permissions', () => {
      const context = {
        user: { userId: 'user-1', role: 'admin' as const },
        action: 'agent:delete' as const,
        resource: { id: 'agent-1', owner: 'user-2' },
      };

      expect(Authorization.canPerform(context)).toBe(true);
    });

    it('operator should not delete others agents', () => {
      const context = {
        user: { userId: 'user-1', role: 'operator' as const },
        action: 'agent:delete' as const,
        resource: { id: 'agent-1', owner: 'user-2' },
      };

      expect(Authorization.canPerform(context)).toBe(false);
    });

    it('only admin can delete agents', () => {
      // Operators cannot delete any agent (ownership doesn't matter for non-admin)
      const context = {
        user: { userId: 'user-1', role: 'operator' as const, ownedResources: ['agent-1'] },
        action: 'agent:delete' as const,
        resource: { id: 'agent-1', owner: 'user-1' },
      };

      // Operators cannot delete even their own agents
      expect(Authorization.canPerform(context)).toBe(false);
    });

    it('viewer cannot create agents', () => {
      const context = {
        user: { userId: 'user-1', role: 'viewer' as const },
        action: 'agent:create' as const,
      };

      expect(Authorization.canPerform(context)).toBe(false);
    });

    it('operator can queue tasks', () => {
      const context = {
        user: { userId: 'user-1', role: 'operator' as const },
        action: 'task:queue' as const,
      };

      expect(Authorization.canPerform(context)).toBe(true);
    });
  });

  describe('requirePermission', () => {
    it('should throw on denied permission', () => {
      const context = {
        user: { userId: 'user-1', role: 'viewer' as const },
        action: 'agent:delete' as const,
      };

      expect(() => Authorization.requirePermission(context)).toThrow(AuthorizationError);
    });

    it('should not throw on allowed permission', () => {
      const context = {
        user: { userId: 'user-1', role: 'admin' as const },
        action: 'agent:delete' as const,
        resource: { id: 'agent-1', owner: 'user-1' },
      };

      expect(() => Authorization.requirePermission(context)).not.toThrow();
    });
  });

  describe('getPermissions', () => {
    it('should return admin permissions', () => {
      const perms = Authorization.getPermissions('admin');
      expect(perms).toContain('agent:create');
      expect(perms).toContain('agent:delete');
      expect(perms).toContain('audit:read');
      expect(perms).toContain('key:rotate');
    });

    it('should return operator permissions', () => {
      const perms = Authorization.getPermissions('operator');
      expect(perms).toContain('agent:create');
      expect(perms).toContain('task:queue');
      expect(perms).not.toContain('agent:delete');
      expect(perms).not.toContain('audit:read');
    });

    it('should return viewer permissions', () => {
      const perms = Authorization.getPermissions('viewer');
      expect(perms).toContain('agent:list');
      expect(perms).toContain('task:list');
      expect(perms).not.toContain('agent:create');
      expect(perms).not.toContain('task:queue');
    });
  });

  describe('getDefaultRole', () => {
    it('should return operator as default', () => {
      expect(Authorization.getDefaultRole()).toBe('operator');
    });
  });

  describe('isValidRole', () => {
    it('should validate valid roles', () => {
      expect(Authorization.isValidRole('admin')).toBe(true);
      expect(Authorization.isValidRole('operator')).toBe(true);
      expect(Authorization.isValidRole('viewer')).toBe(true);
    });

    it('should reject invalid roles', () => {
      expect(Authorization.isValidRole('superadmin')).toBe(false);
      expect(Authorization.isValidRole('user')).toBe(false);
      expect(Authorization.isValidRole('')).toBe(false);
    });
  });

  describe('resource ownership', () => {
    it('admin can perform ownership-required actions on any resource', () => {
      const context = {
        user: { userId: 'user-1', role: 'admin' as const },
        action: 'agent:delete' as const,
        resource: { id: 'agent-1', owner: 'user-2' },
      };

      expect(Authorization.canPerform(context)).toBe(true);
    });

    it('admin can stop any agent', () => {
      const context = {
        user: { userId: 'user-1', role: 'admin' as const },
        action: 'agent:stop' as const,
        resource: { id: 'agent-1', owner: 'user-2' },
      };

      expect(Authorization.canPerform(context)).toBe(true);
    });

    it('user cannot perform ownership-required actions on others resources', () => {
      const context = {
        user: { userId: 'user-1', role: 'operator' as const },
        action: 'agent:stop' as const,
        resource: { id: 'agent-1', owner: 'user-2' },
      };

      expect(Authorization.canPerform(context)).toBe(false);
    });
  });
});
