/**
 * Keyboard input handler using Node.js readline
 */

import * as readline from 'readline';

export type KeyHandler = (key: string, data: any) => void;

export class KeyboardHandler {
  private handlers: Map<string, KeyHandler> = new Map();
  private textInputHandler?: (char: string) => void;
  private textInputMode = false;

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
   * Enable text input mode for capturing character input
   */
  enableTextInput(handler: (char: string) => void): void {
    this.textInputMode = true;
    this.textInputHandler = handler;
  }

  /**
   * Disable text input mode
   */
  disableTextInput(): void {
    this.textInputMode = false;
    this.textInputHandler = undefined;
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

      // Handle text input mode
      if (this.textInputMode && this.textInputHandler) {
        // Allow special keys even in text input mode
        if (key.name === 'return' || key.name === 'escape' || key.name === 'backspace' ||
            key.name === 'up' || key.name === 'down' || key.name === 'space') {
          const keyName = key.name;
          if (this.handlers.has(keyName)) {
            this.handlers.get(keyName)!(keyName, key);
          }
          return;
        }

        // Capture printable characters
        if (str && str.length === 1 && !key.ctrl && !key.meta) {
          this.textInputHandler(str);
          return;
        }
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
