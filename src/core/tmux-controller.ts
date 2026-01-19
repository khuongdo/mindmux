/**
 * Tmux session controller
 * Simplified from MindMux v1 - only read operations
 */

import { execSync } from 'child_process';

/**
 * Sanitize input for tmux commands to prevent command injection
 */
function sanitizeTmuxInput(input: string): string {
  // Remove shell special characters and limit to alphanumeric, dash, underscore, percent, colon
  return input.replace(/[^a-zA-Z0-9\-_%:]/g, '');
}

export class TmuxController {
  /**
   * List all tmux sessions
   */
  async listSessions(): Promise<string[]> {
    try {
      const output = execSync('tmux list-sessions -F "#{session_name}"', {
        encoding: 'utf-8',
      });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * List panes in a session
   */
  async listPanes(sessionName: string): Promise<Array<{ paneId: string; windowId: string }>> {
    try {
      const sanitizedSession = sanitizeTmuxInput(sessionName);
      const output = execSync(
        `tmux list-panes -t ${sanitizedSession} -F "#{pane_id}|#{window_id}"`,
        { encoding: 'utf-8' }
      );
      return output
        .trim()
        .split('\n')
        .map(line => {
          const [paneId, windowId] = line.split('|');
          return { paneId, windowId };
        });
    } catch {
      return [];
    }
  }

  /**
   * Get process running in pane
   */
  async getProcessName(paneId: string): Promise<string> {
    try {
      const sanitizedPane = sanitizeTmuxInput(paneId);
      const output = execSync(
        `tmux display -p -t ${sanitizedPane} '#{pane_current_command}'`,
        { encoding: 'utf-8' }
      );
      return output.trim();
    } catch {
      return '';
    }
  }

  /**
   * Get working directory of pane
   */
  async getWorkingDirectory(paneId: string): Promise<string> {
    try {
      const sanitizedPane = sanitizeTmuxInput(paneId);
      const output = execSync(
        `tmux display -p -t ${sanitizedPane} '#{pane_current_path}'`,
        { encoding: 'utf-8' }
      );
      return output.trim();
    } catch {
      return '';
    }
  }

  /**
   * Capture pane output (for status detection and history)
   */
  async captureOutput(paneId: string, lines: number = 10): Promise<string> {
    try {
      const sanitizedPane = sanitizeTmuxInput(paneId);
      const sanitizedLines = Math.max(1, Math.min(10000, lines)); // Limit 1-10000
      const output = execSync(
        `tmux capture-pane -p -t ${sanitizedPane} -S -${sanitizedLines}`,
        { encoding: 'utf-8' }
      );
      return output;
    } catch {
      return '';
    }
  }

  /**
   * Attach to session
   */
  async attach(sessionName: string): Promise<void> {
    const sanitizedSession = sanitizeTmuxInput(sessionName);
    execSync(`tmux attach -t ${sanitizedSession}`, { stdio: 'inherit' });
  }

  /**
   * Create new pane (for forking)
   */
  async splitPane(sessionName: string, vertical: boolean = true): Promise<string> {
    const flag = vertical ? '-h' : '-v';
    const sanitizedSession = sanitizeTmuxInput(sessionName);
    const output = execSync(
      `tmux split-window ${flag} -t ${sanitizedSession} -P -F "#{pane_id}"`,
      { encoding: 'utf-8' }
    );
    return output.trim();
  }

  /**
   * Send keys to pane
   */
  async sendKeys(paneId: string, keys: string): Promise<void> {
    const sanitizedPane = sanitizeTmuxInput(paneId);
    // Escape double quotes and backslashes for shell safety
    const escapedKeys = keys.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    execSync(`tmux send-keys -t ${sanitizedPane} "${escapedKeys}" Enter`);
  }

  /**
   * Check if tmux is available
   */
  isAvailable(): boolean {
    try {
      execSync('which tmux', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}
