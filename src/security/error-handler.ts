/**
 * Error Handler
 * Provides safe error formatting for user-facing messages
 * Logs full details internally while exposing generic messages to users
 */

import { InputValidator } from './input-validator.js';

export interface ErrorContext {
  action?: string;
  resource?: string;
  userId?: string;
  timestamp?: number;
}

export class ErrorHandler {
  /**
   * Format error safely for user display
   * Strips internal details, stack traces, DB information
   */
  static formatUserMessage(error: Error | string, context?: ErrorContext): string {
    let message = typeof error === 'string' ? error : error.message;

    // Generic error messages by type
    if (message.includes('ENOENT') || message.includes('not found')) {
      return 'Resource not found';
    }

    if (message.includes('EACCES') || message.includes('permission denied')) {
      return 'Access denied';
    }

    if (message.includes('EADDRINUSE') || message.includes('already in use')) {
      return 'Service already running';
    }

    if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
      return 'Operation timed out';
    }

    if (message.includes('ECONNREFUSED') || message.includes('connection refused')) {
      return 'Connection failed';
    }

    if (message.includes('SQL') || message.includes('DATABASE')) {
      return 'Database operation failed';
    }

    if (message.includes('JSON.parse') || message.includes('JSON')) {
      return 'Invalid data format';
    }

    // Custom error types
    if (message.includes('ValidationError')) {
      return message.replace('ValidationError: ', '');
    }

    if (message.includes('AuthorizationError')) {
      return 'Operation not permitted';
    }

    if (message.includes('decryption failed')) {
      return 'Decryption failed';
    }

    // Default: generic message
    return 'An error occurred';
  }

  /**
   * Log error with full details for debugging
   */
  static logError(error: Error | string, context?: ErrorContext): void {
    const timestamp = context?.timestamp || Date.now();
    const action = context?.action ? ` [${context.action}]` : '';
    const resource = context?.resource ? ` resource=${context.resource}` : '';
    const userId = context?.userId ? ` user=${context.userId}` : '';

    if (typeof error === 'string') {
      console.error(`[${new Date(timestamp).toISOString()}]${action}${resource}${userId} ${error}`);
    } else {
      console.error(`[${new Date(timestamp).toISOString()}]${action}${resource}${userId}`);
      console.error(error);
    }
  }

  /**
   * Sanitize error for logging (prevent injection)
   */
  static sanitizeForLogging(value: unknown): string {
    if (value instanceof Error) {
      return `${value.name}: ${value.message}`;
    }

    if (typeof value === 'string') {
      return InputValidator.sanitizeForLogging(value);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(
    error: Error | string,
    statusCode: number = 500,
    context?: ErrorContext
  ): { message: string; code: string; timestamp: number } {
    const userMessage = this.formatUserMessage(error, context);
    const code = this.getErrorCode(error);

    return {
      message: userMessage,
      code,
      timestamp: context?.timestamp || Date.now(),
    };
  }

  /**
   * Get standardized error code
   */
  private static getErrorCode(error: Error | string): string {
    const message = typeof error === 'string' ? error : error.message;

    if (message.includes('ValidationError')) {
      return 'VALIDATION_ERROR';
    }

    if (message.includes('AuthorizationError')) {
      return 'AUTHORIZATION_ERROR';
    }

    if (message.includes('ENOENT')) {
      return 'NOT_FOUND';
    }

    if (message.includes('EACCES')) {
      return 'ACCESS_DENIED';
    }

    if (message.includes('EADDRINUSE')) {
      return 'ALREADY_IN_USE';
    }

    if (message.includes('ETIMEDOUT')) {
      return 'TIMEOUT';
    }

    if (message.includes('decryption')) {
      return 'DECRYPTION_ERROR';
    }

    return 'INTERNAL_ERROR';
  }

  /**
   * Handle promise rejection safely
   */
  static async handleAsync<T>(
    promise: Promise<T>,
    context?: ErrorContext
  ): Promise<{ success: boolean; data?: T; error?: { message: string; code: string } }> {
    try {
      const data = await promise;
      return { success: true, data };
    } catch (error) {
      const response = this.createErrorResponse(error as Error | string, 500, context);
      this.logError(error as Error | string, context);
      return { success: false, error: { message: response.message, code: response.code } };
    }
  }
}
