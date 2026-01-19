/**
 * Keyboard Handler
 * Process raw keyboard input for TUI navigation
 */

import { EventEmitter } from 'events';

export class KeyboardHandler extends EventEmitter {
  private cleanupFn?: () => void;

  /**
   * Enable keyboard input capture
   */
  enable(): void {
    // Enable raw mode for keypress events
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const handler = (data: string) => {
      const key = this.parseKey(data);
      if (key) {
        this.emit(key, data);
      }
    };

    process.stdin.on('data', handler);

    this.cleanupFn = () => {
      process.stdin.removeListener('data', handler);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };
  }

  /**
   * Parse raw key data to key name
   */
  private parseKey(data: string): string | null {
    // Ctrl+C
    if (data === '\u0003') {
      return 'ctrl+c';
    }

    // Escape
    if (data === '\u001b') {
      return 'escape';
    }

    // Return/Enter
    if (data === '\r' || data === '\n') {
      return 'return';
    }

    // Backspace/Delete
    if (data === '\u007f' || data === '\u0008') {
      return 'backspace';
    }

    // Arrow keys
    if (data === '\u001b[A') {
      return 'up';
    }
    if (data === '\u001b[B') {
      return 'down';
    }

    // Space
    if (data === ' ') {
      return 'space';
    }

    // Regular keys (single char)
    if (data.length === 1 && data.charCodeAt(0) >= 32) {
      return data.toLowerCase();
    }

    return null;
  }

  /**
   * Cleanup keyboard handler
   */
  cleanup(): void {
    if (this.cleanupFn) {
      this.cleanupFn();
    }
  }
}
