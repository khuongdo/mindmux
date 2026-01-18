/**
 * Main TUI controller
 */

import { ScreenBuffer } from './screen-buffer.js';
import { KeyboardHandler } from './keyboard-handler.js';
import { colors } from '../utils/colors.js';
import { boxTop, boxBottom, boxLine, center } from '../utils/formatters.js';

export interface TUIOptions {
  title?: string;
  refreshInterval?: number;
}

export class TUIManager {
  private screen: ScreenBuffer;
  private keyboard: KeyboardHandler;
  private running = false;
  private refreshTimer?: NodeJS.Timeout;
  private options: Required<TUIOptions>;

  constructor(options: TUIOptions = {}) {
    this.screen = new ScreenBuffer();
    this.keyboard = new KeyboardHandler();
    this.options = {
      title: options.title || 'MindMux TUI',
      refreshInterval: options.refreshInterval || 1000,
    };

    this.setupKeyHandlers();
  }

  /**
   * Setup keyboard shortcuts
   */
  private setupKeyHandlers(): void {
    this.keyboard.on('q', () => this.quit());
    this.keyboard.on('ctrl+c', () => this.quit());
    this.keyboard.on('h', () => this.showHelp());
    this.keyboard.on('?', () => this.showHelp());
  }

  /**
   * Start TUI
   */
  start(): void {
    this.running = true;
    this.keyboard.start();

    // Initial render
    this.render();

    // Setup refresh timer
    this.refreshTimer = setInterval(() => {
      if (this.running) {
        this.render();
      }
    }, this.options.refreshInterval);
  }

  /**
   * Render screen
   */
  private render(): void {
    this.screen.clear();

    const width = this.screen.getWidth();

    // Header
    this.screen.writeLine(colors.border(boxTop(width)));
    this.screen.writeLine(
      colors.border(boxLine(colors.header(center(this.options.title, width - 4)), width))
    );
    this.screen.writeLine(colors.border(boxBottom(width)));

    // Content (placeholder)
    this.screen.writeLine('');
    this.screen.writeLine(center('Press h for help, q to quit', width));
    this.screen.writeLine('');

    // Footer
    this.screen.writeLine(colors.border(boxTop(width)));
    this.screen.writeLine(
      colors.border(boxLine(colors.dim('h: help | q: quit'), width))
    );

    this.screen.render();
  }

  /**
   * Show help screen
   */
  private showHelp(): void {
    // TODO: Implement help overlay with dismissal in Phase 5.3
    // For now, just render help info in main screen
    this.screen.clear();
    const width = this.screen.getWidth();

    this.screen.writeLine(colors.border(boxTop(width)));
    this.screen.writeLine(
      colors.border(boxLine(colors.header(center('Help', width - 4)), width))
    );
    this.screen.writeLine(colors.border(boxBottom(width)));
    this.screen.writeLine('');
    this.screen.writeLine('  Keyboard Shortcuts:');
    this.screen.writeLine('');
    this.screen.writeLine('  h, ?    - Show this help');
    this.screen.writeLine('  q       - Quit');
    this.screen.writeLine('  Ctrl+C  - Quit');
    this.screen.writeLine('');
    this.screen.writeLine(colors.border(boxTop(width)));
    this.screen.writeLine(
      colors.border(boxLine(colors.dim('Phase 5.1 - Core TUI Foundation'), width))
    );
    this.screen.render();
  }

  /**
   * Quit TUI
   */
  quit(): void {
    this.running = false;

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.keyboard.cleanup();
    this.screen.cleanup();

    process.exit(0);
  }
}
