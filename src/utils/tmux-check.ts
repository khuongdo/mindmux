/**
 * Tmux availability checker
 * Validates tmux installation before session operations
 */

import { execSync } from 'child_process';

/**
 * Check if tmux is available on the system
 */
export function isTmuxAvailable(): boolean {
  try {
    execSync('tmux -V', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure tmux is available, throw error if not
 */
export function ensureTmuxAvailable(): void {
  if (!isTmuxAvailable()) {
    throw new Error(
      'tmux not found. Install via:\n' +
      '  macOS: brew install tmux\n' +
      '  Ubuntu/Debian: apt install tmux\n' +
      '  WSL: apt install tmux'
    );
  }
}

/**
 * Get tmux version
 */
export function getTmuxVersion(): string | null {
  try {
    const output = execSync('tmux -V', { encoding: 'utf-8' });
    return output.trim();
  } catch {
    return null;
  }
}
