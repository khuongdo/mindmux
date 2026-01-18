/**
 * Screen buffer for efficient terminal rendering
 */

import { ANSI } from '../utils/ansi-codes.js';

export class ScreenBuffer {
  private buffer: string[] = [];
  private width: number;
  private height: number;

  constructor() {
    this.width = process.stdout.columns || 80;
    this.height = process.stdout.rows || 24;

    // Handle terminal resize
    process.stdout.on('resize', () => {
      this.width = process.stdout.columns || 80;
      this.height = process.stdout.rows || 24;
    });
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Add line to buffer
   */
  writeLine(line: string): void {
    this.buffer.push(line);
  }

  /**
   * Render buffer to screen
   */
  render(): void {
    // Enter alternate screen, hide cursor
    process.stdout.write(ANSI.enterAlternateScreen);
    process.stdout.write(ANSI.cursorHide);

    // Move to top
    process.stdout.write(ANSI.cursorTo(1, 1));

    // Write all lines
    process.stdout.write(this.buffer.join('\n'));

    // Clear to end of screen (remove old content)
    process.stdout.write(ANSI.clearLineEnd);
  }

  /**
   * Cleanup and restore terminal
   */
  cleanup(): void {
    process.stdout.write(ANSI.cursorShow);
    process.stdout.write(ANSI.exitAlternateScreen);
    process.stdout.write('\n');
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }
}
