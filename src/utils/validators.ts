/**
 * Input validation utilities
 */

import { AgentType } from '../core/types';
import { VALID_CAPABILITIES } from './defaults';

/**
 * Validate agent name
 * Rules: 3-64 chars, alphanumeric, hyphens, underscores only
 */
export function validateAgentName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  return /^[a-zA-Z0-9_-]+$/.test(name) && name.length >= 3 && name.length <= 64;
}

/**
 * Validate agent type
 */
export function validateAgentType(type: string): type is AgentType {
  return ['claude', 'gemini', 'gpt4', 'opencode'].includes(type);
}

/**
 * Validate capabilities
 */
export function validateCapabilities(caps: string[]): boolean {
  if (!Array.isArray(caps) || caps.length === 0) {
    return false;
  }

  return caps.every(cap => VALID_CAPABILITIES.includes(cap as any));
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
