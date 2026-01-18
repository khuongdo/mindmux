/**
 * Keyboard input handler using Node.js readline
 */

import * as readline from 'readline';

export type KeyHandler = (key: string, data: any) => void;

export class KeyboardHandler {
  private handlers: Map<string, KeyHandler> = new Map();

  constructor() {
    // Set raw mode for character-by-character input
    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);
    }
  }

  /**
   * Register key handler
   */
  on(key: string, handler: KeyHandler): void {
    this.handlers.set(key, handler);
  }

  /**
   * Start listening for key events
   */
  start(): void {
    process.stdin.on('keypress', (str, key) => {
      if (!key) return;

      // Handle Ctrl+C
      if (key.ctrl && key.name === 'c') {
        const handler = this.handlers.get('ctrl+c');
        if (handler) {
          handler('ctrl+c', key);
        } else {
          this.cleanup();
          process.exit(0);
        }
        return;
      }

      // Handle named keys (up, down, etc.)
      const keyName = key.name;
      if (this.handlers.has(keyName)) {
        this.handlers.get(keyName)!(keyName, key);
        return;
      }

      // Handle character keys
      if (str && this.handlers.has(str)) {
        this.handlers.get(str)!(str, key);
      }
    });
  }

  /**
   * Stop listening and cleanup
   */
  cleanup(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.removeAllListeners('keypress');
  }
}
