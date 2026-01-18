/**
 * Main TUI controller
 */

import { ScreenBuffer } from './screen-buffer.js';
import { KeyboardHandler } from './keyboard-handler.js';
import { colors } from '../utils/colors.js';
import { boxTop, boxBottom, boxLine, center } from '../utils/formatters.js';
import { AgentManager } from '../../core/agent-manager.js';
import { renderSessionList } from '../components/session-list.js';

export interface TUIOptions {
  title?: string;
  refreshInterval?: number;
  agentManager: AgentManager;
}

export class TUIManager {
  private screen: ScreenBuffer;
  private keyboard: KeyboardHandler;
  private running = false;
  private refreshTimer?: NodeJS.Timeout;
  private options: Required<TUIOptions>;
  private selectedIndex = 0;

  constructor(options: TUIOptions) {
    this.screen = new ScreenBuffer();
    this.keyboard = new KeyboardHandler();
    this.options = {
      title: options.title || 'MindMux TUI',
      refreshInterval: options.refreshInterval || 1000,
      agentManager: options.agentManager,
    };

    this.setupKeyHandlers();
  }

  /**
   * Setup keyboard shortcuts
   */
  private setupKeyHandlers(): void {
    // Navigation
    this.keyboard.on('j', () => this.navigateDown());
    this.keyboard.on('k', () => this.navigateUp());
    this.keyboard.on('down', () => this.navigateDown());
    this.keyboard.on('up', () => this.navigateUp());

    // Actions
    this.keyboard.on('q', () => this.quit());
    this.keyboard.on('ctrl+c', () => this.quit());
    this.keyboard.on('h', () => this.showHelp());
    this.keyboard.on('?', () => this.showHelp());
  }

  /**
   * Navigate down in agent list
   */
  private navigateDown(): void {
    const agents = this.options.agentManager.listAgents();
    if (agents.length > 0) {
      this.selectedIndex = Math.min(this.selectedIndex + 1, agents.length - 1);
      this.render();
    }
  }

  /**
   * Navigate up in agent list
   */
  private navigateUp(): void {
    this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
    this.render();
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

    // Session list
    const agents = this.options.agentManager.listAgents();
    const sessionLines = renderSessionList(agents, {
      width,
      selectedIndex: this.selectedIndex,
    });

    sessionLines.forEach(line => this.screen.writeLine(line));

    // Footer
    this.screen.writeLine(colors.border(boxTop(width)));
    this.screen.writeLine(
      colors.border(boxLine(colors.dim('j/k: navigate | h: help | q: quit'), width))
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
    this.screen.writeLine('  j, ↓    - Navigate down');
    this.screen.writeLine('  k, ↑    - Navigate up');
    this.screen.writeLine('  h, ?    - Show this help');
    this.screen.writeLine('  q       - Quit');
    this.screen.writeLine('  Ctrl+C  - Quit');
    this.screen.writeLine('');
    this.screen.writeLine(colors.border(boxTop(width)));
    this.screen.writeLine(
      colors.border(boxLine(colors.dim('Phase 5.2 - Session Display'), width))
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
