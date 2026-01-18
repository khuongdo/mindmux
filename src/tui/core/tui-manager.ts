/**
 * Main TUI controller
 */

import { ScreenBuffer } from './screen-buffer.js';
import { KeyboardHandler } from './keyboard-handler.js';
import { colors } from '../utils/colors.js';
import { boxTop, boxBottom, boxLine, center } from '../utils/formatters.js';
import { AgentManager } from '../../core/agent-manager.js';
import { renderSessionList } from '../components/session-list.js';
import { renderAgentDetail } from '../components/agent-detail.js';
import { Agent } from '../../core/types.js';

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
  private viewMode: 'list' | 'detail' = 'list';
  private selectedAgent: Agent | null = null;
  private refreshPaused = false;

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
    this.keyboard.on('j', () => this.handleKey('navigate-down'));
    this.keyboard.on('k', () => this.handleKey('navigate-up'));
    this.keyboard.on('down', () => this.handleKey('navigate-down'));
    this.keyboard.on('up', () => this.handleKey('navigate-up'));

    // Selection
    this.keyboard.on('return', () => this.handleKey('select'));
    this.keyboard.on('escape', () => this.handleKey('back'));
    this.keyboard.on('backspace', () => this.handleKey('back'));

    // Controls
    this.keyboard.on('r', () => this.toggleRefresh());
    this.keyboard.on('q', () => this.quit());
    this.keyboard.on('ctrl+c', () => this.quit());
    this.keyboard.on('h', () => this.showHelp());
    this.keyboard.on('?', () => this.showHelp());
  }

  /**
   * Handle key based on current view mode
   */
  private handleKey(action: string): void {
    if (this.viewMode === 'detail') {
      // In detail view, any key returns to list
      if (action === 'back' || action === 'select') {
        this.viewMode = 'list';
        this.selectedAgent = null;
        this.render();
      }
    } else {
      // In list view
      if (action === 'navigate-down') {
        this.navigateDown();
      } else if (action === 'navigate-up') {
        this.navigateUp();
      } else if (action === 'select') {
        this.viewAgentDetail();
      }
    }
  }

  /**
   * View selected agent detail
   */
  private viewAgentDetail(): void {
    const agents = this.options.agentManager.listAgents();
    if (agents.length > 0 && this.selectedIndex >= 0 && this.selectedIndex < agents.length) {
      this.selectedAgent = agents[this.selectedIndex];
      this.viewMode = 'detail';
      this.render();
    }
  }

  /**
   * Toggle refresh pause
   */
  private toggleRefresh(): void {
    this.refreshPaused = !this.refreshPaused;
    this.render();
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
      if (this.running && !this.refreshPaused && this.viewMode === 'list') {
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

    // Content based on view mode
    if (this.viewMode === 'detail' && this.selectedAgent) {
      // Detail view
      const detailLines = renderAgentDetail(this.selectedAgent, width);
      detailLines.forEach(line => this.screen.writeLine(line));
    } else {
      // List view
      const agents = this.options.agentManager.listAgents();
      const sessionLines = renderSessionList(agents, {
        width,
        selectedIndex: this.selectedIndex,
      });

      sessionLines.forEach(line => this.screen.writeLine(line));

      // Footer with refresh status
      const refreshStatus = this.refreshPaused ? colors.warning('[PAUSED]') : '';
      const footer = `j/k: nav | Enter: view | r: ${this.refreshPaused ? 'resume' : 'pause'} | h: help | q: quit ${refreshStatus}`;

      this.screen.writeLine(colors.border(boxTop(width)));
      this.screen.writeLine(
        colors.border(boxLine(colors.dim(footer), width))
      );
    }

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
    this.screen.writeLine('  j, ↓       - Navigate down');
    this.screen.writeLine('  k, ↑       - Navigate up');
    this.screen.writeLine('  Enter      - View agent details');
    this.screen.writeLine('  Esc, ←     - Back to list');
    this.screen.writeLine('  r          - Toggle auto-refresh');
    this.screen.writeLine('  h, ?       - Show this help');
    this.screen.writeLine('  q, Ctrl+C  - Quit');
    this.screen.writeLine('');
    this.screen.writeLine(colors.border(boxTop(width)));
    this.screen.writeLine(
      colors.border(boxLine(colors.dim('Phase 5.3 - Interactive Controls'), width))
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
