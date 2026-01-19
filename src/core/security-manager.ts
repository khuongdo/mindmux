/**
 * Security Manager
 * Centralized security operations and initialization
 * Integrates secret encryption, authentication, authorization, validation, and audit logging
 */

import { SecretManager, EncryptedSecret } from '../security/secret-manager.js';
import { getAuthManager, AuthSession } from '../security/auth-manager.js';
import { Authorization, AuthUser, OperationAction } from '../security/authorization.js';
import { InputValidator, ValidationError } from '../security/input-validator.js';
import { RateLimiter } from '../security/rate-limiter.js';
import { getAuditService, AuditAction } from '../security/audit-service.js';
import { ErrorHandler } from '../security/error-handler.js';
import { AuthMiddleware, AuthContext } from '../middleware/auth-middleware.js';
import { AuthorizationMiddleware } from '../middleware/authorization-middleware.js';
import { RateLimitMiddleware, RateLimitContext } from '../middleware/rate-limit-middleware.js';

export interface SecurityInitOptions {
  kek?: string;
  userId?: string;
  defaultRole?: 'admin' | 'operator' | 'viewer';
}

export class SecurityManager {
  private static kek: string = process.env.MINDMUX_KEK || '';
  private static initialized: boolean = false;

  /**
   * Initialize security system
   */
  static initialize(options: SecurityInitOptions = {}): void {
    // Set Key Encryption Key
    if (options.kek) {
      this.kek = options.kek;
    } else if (!this.kek) {
      throw new Error('MINDMUX_KEK environment variable not set. Cannot initialize security.');
    }

    // Validate KEK
    if (!SecretManager.validateKEK(this.kek)) {
      throw new Error('Invalid KEK: must be at least 32 characters.');
    }

    // Create default session if needed
    const authManager = getAuthManager();
    if (authManager.getStats().activeSessions === 0) {
      const userId = options.userId || 'default-user';
      const role = options.defaultRole || 'operator';
      const session = authManager.createSession(userId, role);

      // Set as environment variable for CLI
      process.env.MINDMUX_AUTH_TOKEN = session.token;
    }

    this.initialized = true;
  }

  /**
   * Check if security is initialized
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  // ============ Secret Management ============

  /**
   * Encrypt a secret (API key, credential)
   */
  static encryptSecret(plaintext: string): EncryptedSecret {
    if (!this.kek) {
      throw new Error('KEK not configured. Call initialize() first.');
    }
    return SecretManager.encrypt(plaintext, this.kek);
  }

  /**
   * Decrypt a secret
   */
  static decryptSecret(encrypted: EncryptedSecret): string {
    if (!this.kek) {
      throw new Error('KEK not configured. Call initialize() first.');
    }
    return SecretManager.decrypt(encrypted, this.kek);
  }

  /**
   * Rotate encryption key
   */
  static rotateEncryptionKey(newKek: string): void {
    if (!SecretManager.validateKEK(newKek)) {
      throw new Error('Invalid KEK: must be at least 32 characters.');
    }
    const oldKek = this.kek;
    this.kek = newKek;
    process.env.MINDMUX_KEK = newKek;
  }

  // ============ Authentication ============

  /**
   * Create auth session
   */
  static createSession(userId: string, role: 'admin' | 'operator' | 'viewer' = 'operator'): AuthSession {
    const authManager = getAuthManager();
    return authManager.createSession(userId, role);
  }

  /**
   * Validate auth token
   */
  static validateAuthToken(token: string): AuthContext {
    return AuthMiddleware.validateToken(token);
  }

  /**
   * Extract auth context
   */
  static getAuthContext(options?: Record<string, unknown>): AuthContext {
    return AuthMiddleware.extractAuthContext(options);
  }

  // ============ Authorization ============

  /**
   * Check permission
   */
  static checkPermission(
    authContext: AuthContext,
    action: OperationAction,
    resource?: { id: string; owner?: string }
  ): void {
    AuthorizationMiddleware.checkPermission(authContext, action, resource);
  }

  /**
   * Check if permission is allowed
   */
  static isAllowed(
    authContext: AuthContext,
    action: OperationAction,
    resource?: { id: string; owner?: string }
  ): boolean {
    return AuthorizationMiddleware.isAllowed(authContext, action, resource);
  }

  /**
   * Get permissions for role
   */
  static getPermissions(role: 'admin' | 'operator' | 'viewer'): OperationAction[] {
    return AuthorizationMiddleware.getPermissions(role);
  }

  // ============ Input Validation ============

  /**
   * Validate agent name
   */
  static validateAgentName(name: string): void {
    InputValidator.validateAgentName(name);
  }

  /**
   * Validate prompt
   */
  static validatePrompt(prompt: string): void {
    InputValidator.validatePrompt(prompt);
  }

  /**
   * Validate capabilities
   */
  static validateCapabilities(capabilities: unknown[]): void {
    InputValidator.validateCapabilities(capabilities);
  }

  /**
   * Get valid capabilities
   */
  static getValidCapabilities(): string[] {
    return InputValidator.getValidCapabilities();
  }

  // ============ Rate Limiting ============

  /**
   * Check rate limit
   */
  static checkRateLimit(identifier: string): RateLimitContext {
    return RateLimitMiddleware.checkLimit(identifier);
  }

  /**
   * Get rate limit status
   */
  static getRateLimitStatus(identifier: string): RateLimitContext {
    return RateLimitMiddleware.getStatus(identifier);
  }

  // ============ Audit Logging ============

  /**
   * Log audit entry
   */
  static logAudit(
    userId: string,
    action: AuditAction,
    resource: string,
    resourceType: string,
    result: 'success' | 'failure',
    options?: {
      details?: Record<string, unknown>;
      errorMessage?: string;
      ipAddress?: string;
      sessionToken?: string;
    }
  ): void {
    const auditService = getAuditService();
    auditService.log(userId, action, resource, resourceType, result, options);
  }

  /**
   * Query audit log
   */
  static getAuditLog(filter?: {
    userId?: string;
    action?: AuditAction;
    resource?: string;
    resourceType?: string;
    result?: 'success' | 'failure';
    startTime?: number;
    endTime?: number;
    limit?: number;
    offset?: number;
  }): any[] {
    const auditService = getAuditService();
    return auditService.query(filter || {});
  }

  // ============ Error Handling ============

  /**
   * Format error for user display
   */
  static formatErrorMessage(error: Error | string, context?: { action?: string; resource?: string }): string {
    return ErrorHandler.formatUserMessage(error, {
      action: context?.action,
      resource: context?.resource,
    });
  }

  /**
   * Log error internally
   */
  static logError(error: Error | string, context?: { action?: string; resource?: string; userId?: string }): void {
    ErrorHandler.logError(error, context);
  }

  /**
   * Get KEK (for testing)
   */
  static getKEK(): string {
    return this.kek;
  }
}
