/**
 * Status Detector
 * Parse terminal output to detect session status
 */

import type { SessionStatus } from '../types/index.js';

/**
 * Parse terminal output to detect session status
 */
export function detectStatus(output: string): SessionStatus {
  const normalized = output.trim().toLowerCase();

  // Running indicators
  if (
    normalized.includes('thinking...') ||
    normalized.includes('processing...') ||
    normalized.includes('generating...') ||
    /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/.test(normalized) // Spinner characters
  ) {
    return 'running';
  }

  // Error indicators
  if (
    normalized.includes('error:') ||
    normalized.includes('failed') ||
    normalized.includes('exception') ||
    normalized.includes('traceback')
  ) {
    return 'error';
  }

  // Waiting for input (prompt visible)
  if (
    normalized.includes('> ') ||
    normalized.includes('what would you like') ||
    normalized.includes('how can i help') ||
    normalized.includes('enter your request')
  ) {
    return 'waiting';
  }

  // Check last line for prompt indicators
  const lastLine = normalized.split('\n').filter(Boolean).pop() || '';
  if (lastLine.startsWith('>') || lastLine.endsWith('> ')) {
    return 'waiting';
  }

  // Idle (ready but no active prompt)
  if (normalized.includes('ready') || normalized.length === 0) {
    return 'idle';
  }

  // Default to unknown if can't determine
  return 'unknown';
}

/**
 * Get status display symbol
 */
export function getStatusSymbol(status: SessionStatus): string {
  switch (status) {
    case 'running':
      return '●';
    case 'waiting':
      return '◐';
    case 'idle':
      return '○';
    case 'error':
      return '✕';
    default:
      return '?';
  }
}

/**
 * Get status color name for the colors utility
 */
export function getStatusColor(status: SessionStatus): 'running' | 'waiting' | 'idle' | 'failed' | 'dim' {
  switch (status) {
    case 'running':
      return 'running';
    case 'waiting':
      return 'waiting';
    case 'idle':
      return 'idle';
    case 'error':
      return 'failed';
    default:
      return 'dim';
  }
}
