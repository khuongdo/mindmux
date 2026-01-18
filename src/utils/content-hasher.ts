/**
 * Content Hasher
 * Simple hash function for detecting content changes
 */

import { createHash } from 'crypto';

/**
 * Create MD5 hash of content for change detection
 */
export function hashContent(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

/**
 * Clean ANSI escape codes from terminal output
 */
export function cleanTerminalOutput(output: string): string {
  // Remove ANSI escape codes
  const ansiRegex = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
  let cleaned = output.replace(ansiRegex, '');

  // Remove carriage returns
  cleaned = cleaned.replace(/\r/g, '');

  // Normalize whitespace
  cleaned = cleaned.replace(/[ \t]+$/gm, ''); // Trailing spaces
  cleaned = cleaned.replace(/^\s*\n/gm, '\n'); // Empty lines

  return cleaned.trim();
}
