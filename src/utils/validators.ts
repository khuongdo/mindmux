/**
 * Input validation utilities
 */

import { AgentType } from '../core/types.js';
import { VALID_CAPABILITIES } from './defaults.js';

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate agent name
 * Rules: 1-255 chars, alphanumeric, hyphens, underscores only
 * Throws ValidationError on invalid input
 * Sanitizes BOM and other control characters
 */
export function validateAgentName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('Agent name must be a non-empty string');
  }

  // Sanitize: remove BOM and other Unicode control characters
  let sanitized = name.replace(/[\u0000-\u001F\uFEFF]/g, '').trim();

  if (!sanitized) {
    throw new ValidationError('Agent name must be a non-empty string');
  }

  // Check for null bytes specifically
  if (name.includes('\x00')) {
    throw new ValidationError('Agent name contains null bytes');
  }

  if (sanitized.length > 255) {
    throw new ValidationError('Agent name exceeds maximum length of 255 characters');
  }

  // Check for dangerous injection patterns
  if (/[;&|`$<>{}'":]/i.test(sanitized)) {
    throw new ValidationError(
      'Agent name contains invalid characters: ; & | ` $ < > { } \' " :'
    );
  }

  // Check for path traversal patterns
  if (sanitized.includes('..') || sanitized.includes('/') || sanitized.includes('\\')) {
    throw new ValidationError(
      'Agent name contains invalid path characters: . / \\'
    );
  }
}

/**
 * Validate agent type
 */
export function validateAgentType(type: string): type is AgentType {
  return ['claude', 'gemini', 'gpt4', 'opencode'].includes(type);
}

/**
 * Validate capabilities
 * Throws ValidationError if invalid
 * Empty arrays are allowed
 */
export function validateCapabilities(caps: unknown[]): void {
  if (!Array.isArray(caps)) {
    throw new ValidationError('Capabilities must be an array');
  }

  if (caps.length > 100) {
    throw new ValidationError('Capabilities list exceeds maximum of 100 items');
  }

  for (const cap of caps) {
    if (typeof cap !== 'string') {
      throw new ValidationError('Each capability must be a string');
    }

    if (!/^[a-z\-]+$/.test(cap)) {
      throw new ValidationError(`Invalid capability format: ${cap}`);
    }

    if (!VALID_CAPABILITIES.includes(cap as any)) {
      throw new ValidationError(
        `Unknown capability: ${cap}. Valid: ${VALID_CAPABILITIES.join(', ')}`
      );
    }
  }
}

/**
 * Validate prompt text
 * Throws ValidationError if invalid
 * Max size: 50KB
 */
export function validatePrompt(prompt: string): void {
  if (!prompt || typeof prompt !== 'string') {
    throw new ValidationError('Prompt must be a non-empty string');
  }

  // Check length in bytes (UTF-8 encoded)
  const bytes = new TextEncoder().encode(prompt).length;
  if (bytes > 50 * 1024) {
    throw new ValidationError(`Prompt exceeds maximum size of 50KB (got ${bytes} bytes)`);
  }
}

/**
 * Get validation error message for agent name
 */
export function getAgentNameError(name: string): string {
  if (!name) {
    return 'Agent name is required';
  }

  if (name.length < 3) {
    return 'Agent name must be at least 3 characters';
  }

  if (name.length > 64) {
    return 'Agent name must not exceed 64 characters';
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return 'Agent name must contain only alphanumeric characters, hyphens, and underscores';
  }

  return '';
}

/**
 * Get validation error message for agent type
 */
export function getAgentTypeError(type: string): string {
  if (!type) {
    return 'Agent type is required';
  }

  if (!validateAgentType(type)) {
    return `Invalid agent type. Must be one of: claude, gemini, gpt4, opencode`;
  }

  return '';
}

/**
 * Get validation error message for capabilities
 */
export function getCapabilitiesError(caps: string[]): string {
  if (!caps || caps.length === 0) {
    return 'At least one capability is required';
  }

  const invalid = caps.filter(cap => !VALID_CAPABILITIES.includes(cap as any));

  if (invalid.length > 0) {
    return `Invalid capabilities: ${invalid.join(', ')}. Valid: ${VALID_CAPABILITIES.join(', ')}`;
  }

  return '';
}
