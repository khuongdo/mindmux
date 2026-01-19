/**
 * AI Tool Commands
 * Helper functions for tool start commands and status detection
 */

import type { AITool, SessionStatus } from '../types/index.js';

/**
 * Sanitize shell arguments to prevent command injection
 */
function sanitizeShellArg(arg: string): string {
  // Remove shell metacharacters
  return arg.replace(/[;&|`$()<>'"\\]/g, '');
}

/**
 * Get start command for AI tool
 */
export function getToolStartCommand(tool: AITool, projectPath: string): string {
  const safePath = sanitizeShellArg(projectPath);

  switch (tool) {
    case 'claude':
      return `cd "${safePath}" && claude code`;
    case 'gemini':
      return `cd "${safePath}" && gemini chat`;
    case 'opencode':
      return `cd "${safePath}" && opencode`;
    case 'cursor':
      return `cd "${safePath}" && cursor`;
    case 'aider':
      return `cd "${safePath}" && aider`;
    case 'codex':
      return `cd "${safePath}" && codex`;
    default:
      return `cd "${safePath}"`;
  }
}

/**
 * Get initialization timeout for tool (ms)
 */
export function getToolInitTimeout(tool: AITool): number {
  switch (tool) {
    case 'claude':
      return 5000; // Claude initializes quickly
    case 'gemini':
      return 3000;
    case 'opencode':
      return 4000;
    case 'cursor':
      return 5000;
    case 'aider':
      return 3000;
    case 'codex':
      return 4000;
    default:
      return 5000;
  }
}

/**
 * Check if tool is ready from output
 */
export function isToolReady(tool: AITool, output: string): boolean {
  const lower = output.toLowerCase();

  switch (tool) {
    case 'claude':
      // Claude shows welcome message or prompt
      return lower.includes('claude') || lower.includes('>>>') || lower.includes('assistant:');
    case 'gemini':
      return lower.includes('gemini') || lower.includes('>');
    case 'opencode':
      return lower.includes('opencode') || lower.includes('ready');
    case 'cursor':
      return lower.includes('cursor') || lower.includes('ready');
    case 'aider':
      return lower.includes('aider') || lower.includes('>');
    case 'codex':
      return lower.includes('codex') || lower.includes('ready');
    default:
      return output.length > 0; // Fallback: any output means ready
  }
}

/**
 * Detect session status from terminal output
 */
export function detectSessionStatus(output: string): SessionStatus {
  const lower = output.toLowerCase();

  // Error indicators
  if (
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('exception') ||
    lower.includes('traceback')
  ) {
    return 'error';
  }

  // Running indicators (active processing)
  if (
    lower.includes('processing') ||
    lower.includes('generating') ||
    lower.includes('working') ||
    lower.includes('thinking')
  ) {
    return 'running';
  }

  // Waiting indicators (waiting for input)
  if (
    lower.includes('>>>') ||
    lower.includes('>') ||
    lower.includes('user:') ||
    lower.includes('prompt:')
  ) {
    return 'waiting';
  }

  // Idle (has output but unclear state)
  if (output.trim().length > 0) {
    return 'idle';
  }

  return 'unknown';
}
