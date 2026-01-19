/**
 * AI Tool Detector
 * Detect AI tool type from process name
 */

import type { AITool } from '../types/index.js';

/**
 * Detect AI tool type from process name
 */
export function detectAITool(processName: string): AITool | null {
  const lower = processName.toLowerCase();

  // Claude Code
  if (lower.includes('claude')) {
    return 'claude';
  }

  // Gemini CLI
  if (lower.includes('gemini')) {
    return 'gemini';
  }

  // OpenCode
  if (lower.includes('opencode')) {
    return 'opencode';
  }

  // Cursor
  if (lower.includes('cursor')) {
    return 'cursor';
  }

  // Aider
  if (lower.includes('aider')) {
    return 'aider';
  }

  // Codex CLI
  if (lower.includes('codex')) {
    return 'codex';
  }

  return null;
}

/**
 * Check if process name is an AI tool
 */
export function isAITool(processName: string): boolean {
  return detectAITool(processName) !== null;
}

/**
 * Get all supported AI tools
 */
export function getSupportedTools(): AITool[] {
  return ['claude', 'gemini', 'opencode', 'cursor', 'aider', 'codex'];
}
