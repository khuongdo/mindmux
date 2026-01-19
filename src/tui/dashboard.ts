/**
 * TUI Dashboard
 * Interactive terminal interface for managing AI sessions
 */

import { TmuxController } from '../core/tmux-controller.js';
import { SessionScanner } from '../discovery/session-scanner.js';
import { SessionForker } from '../operations/session-fork.js';
import { MCPManager } from '../operations/mcp-manager.js';
import { getStatusSymbol, getStatusColor } from '../discovery/status-detector.js';
import { KeyboardHandler } from './keyboard-handler.js';
import { colors } from './utils/colors.js';
import { boxTop, boxBottom } from './utils/formatters.js';
import { loadLabels, saveLabels } from '../config/config-loader.js';
import type { AISession } from '../types/index.js';
import * as readline from 'readline';

export class Dashboard {
  private tmux: TmuxController;
  private scanner: SessionScanner;
  private forker: SessionForker;
  private mcpManager: MCPManager;
  private keyboard: KeyboardHandler;
  private sessions: AISession[] = [];
  private selectedIndex = 0;
  private searchQuery = '';
  private searchMode = false;
  private refreshInterval?: NodeJS.Timeout;

  constructor() {
    this.tmux = new TmuxController();
    this.scanner = new SessionScanner(this.tmux);
    this.forker = new SessionForker(this.tmux);
    this.mcpManager = new MCPManager(this.tmux);
    this.keyboard = new KeyboardHandler();
    this.setupKeyHandlers();
  }

  /**
   * Setup keyboard event handlers
   */
  private setupKeyHandlers(): void {
    // Global listener for search mode character input
    this.keyboard.on('space', (data) => this.handleKeyPress(data));
    this.keyboard.on('backspace', () => this.handleBackspace());

    // Help
    this.keyboard.on('h', () => this.showHelp());
    this.keyboard.on('?', () => this.showHelp());

    // Navigation (vim-style + arrows)
    this.keyboard.on('j', () => this.handleNavigation('down'));
    this.keyboard.on('k', () => this.handleNavigation('up'));
    this.keyboard.on('down', () => this.handleNavigation('down'));
    this.keyboard.on('up', () => this.handleNavigation('up'));

    // Actions
    this.keyboard.on('return', () => this.attachToSession());
    this.keyboard.on('l', () => this.handleAction('label'));
    this.keyboard.on('f', () => this.handleAction('fork'));
    this.keyboard.on('m', () => this.handleAction('mcp'));
    this.keyboard.on('/', () => this.enterSearchMode());
    this.keyboard.on('escape', () => this.exitSearchMode());

    // Quit
    this.keyboard.on('q', () => this.handleAction('quit'));
    this.keyboard.on('ctrl+c', () => this.quit());

    // Catch all other alphanumeric keys for search mode
    for (let i = 97; i <= 122; i++) {
      const char = String.fromCharCode(i);
      this.keyboard.on(char, (data) => this.handleKeyPress(data));
    }
    for (let i = 48; i <= 57; i++) {
      const char = String.fromCharCode(i);
      this.keyboard.on(char, (data) => this.handleKeyPress(data));
    }
  }

  /**
   * Handle key press for search mode
   */
  private handleKeyPress(data: string): void {
    if (this.searchMode && data) {
      this.searchQuery += data;
      this.refresh();
    }
  }

  /**
   * Handle backspace in search mode
   */
  private handleBackspace(): void {
    if (this.searchMode && this.searchQuery.length > 0) {
      this.searchQuery = this.searchQuery.slice(0, -1);
      this.refresh();
    }
  }

  /**
   * Handle navigation with search mode check
   */
  private handleNavigation(direction: 'up' | 'down'): void {
    if (this.searchMode) return; // Ignore navigation in search mode

    if (direction === 'down') {
      this.navigateDown();
    } else {
      this.navigateUp();
    }
  }

  /**
   * Handle action with search mode check
   */
  private handleAction(action: string): void {
    if (this.searchMode) return; // Ignore actions in search mode

    switch (action) {
      case 'label':
        this.labelSession();
        break;
      case 'fork':
        this.forkSession();
        break;
      case 'mcp':
        this.manageMCP();
        break;
      case 'quit':
        this.quit();
        break;
    }
  }

  /**
   * Navigate down in session list
   */
  private navigateDown(): void {
    if (this.sessions.length === 0) return;

    if (this.selectedIndex < this.sessions.length - 1) {
      this.selectedIndex++;
      this.render();
    }
  }

  /**
   * Navigate up in session list
   */
  private navigateUp(): void {
    if (this.sessions.length === 0) return;

    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.render();
    }
  }

  /**
   * Attach to selected session
   */
  private async attachToSession(): Promise<void> {
    const selected = this.sessions[this.selectedIndex];
    if (!selected) return;

    // Cleanup before attaching
    this.cleanup();

    // Clear screen
    console.clear();
    console.log(`Attaching to session: ${selected.label || selected.id}\n`);

    // Attach to tmux
    await this.tmux.attach(selected.sessionName);
  }

  /**
   * Label selected session
   */
  private async labelSession(): Promise<void> {
    const selected = this.sessions[this.selectedIndex];
    if (!selected) return;

    // Pause refresh
    this.pauseRefresh();

    // Prompt for label
    const label = await this.promptForLabel(selected.label || '');

    if (label) {
      // Update session
      selected.label = label;

      // Save to config
      const labels = loadLabels();
      const existingIndex = labels.findIndex(l => l.sessionId === selected.id);

      if (existingIndex >= 0) {
        labels[existingIndex].label = label;
      } else {
        labels.push({
          sessionId: selected.id,
          label,
          createdAt: new Date(),
        });
      }

      saveLabels(labels);
    }

    // Resume refresh
    this.startRefresh();
    await this.refresh();
  }

  /**
   * Fork selected session
   */
  private async forkSession(): Promise<void> {
    const selected = this.sessions[this.selectedIndex];
    if (!selected) return;

    // Pause refresh
    this.pauseRefresh();

    console.clear();
    console.log('='.repeat(50));
    console.log('  Forking Session');
    console.log('='.repeat(50));
    console.log('');

    try {
      const newPaneId = await this.forker.fork(selected);

      console.log('');
      console.log('='.repeat(50));
      console.log(`✓ Fork complete! New pane: ${newPaneId}`);
      console.log(`  Attach: tmux attach -t ${selected.sessionName}`);
      console.log('='.repeat(50));
      console.log('');
      console.log('Press any key to return to dashboard...');

      // Wait for keypress
      await this.waitForKeypress();
    } catch (error) {
      console.log('');
      console.log('='.repeat(50));
      console.log(`✗ Fork failed: ${error instanceof Error ? error.message : String(error)}`);
      console.log('='.repeat(50));
      console.log('');
      console.log('Press any key to return to dashboard...');

      await this.waitForKeypress();
    }

    // Resume refresh
    this.startRefresh();
    await this.refresh();
  }

  /**
   * Manage MCP servers for selected session
   */
  private async manageMCP(): Promise<void> {
    const selected = this.sessions[this.selectedIndex];
    if (!selected) return;

    // Pause refresh
    this.pauseRefresh();

    console.clear();
    console.log('='.repeat(50));
    console.log('  MCP Server Management');
    console.log('='.repeat(50));
    console.log('');
    console.log(`Session: ${selected.label || selected.id}`);
    console.log('');

    // Get available MCPs
    const mcps = this.mcpManager.getAvailableMCPs();
    const mcpNames = Object.keys(mcps);

    if (mcpNames.length === 0) {
      console.log('No MCP servers configured.');
      console.log('Edit ~/.mindmux/mcp-servers.toml to add MCP servers.');
      console.log('');
      console.log('Press any key to return to dashboard...');
      await this.waitForKeypress();
      this.startRefresh();
      await this.refresh();
      return;
    }

    // Show available MCPs
    console.log('Available MCP Servers:');
    console.log('');

    for (let i = 0; i < mcpNames.length; i++) {
      const name = mcpNames[i];
      const isActive = selected.activeMCPs.includes(name);
      const status = isActive ? colors.success('[ACTIVE]') : colors.dim('[inactive]');
      console.log(`  ${i + 1}. ${name} ${status}`);
    }

    console.log('');
    console.log('Enter number to toggle (or press Enter to cancel):');

    // Prompt for selection
    const choice = await this.promptForInput('');

    if (choice && !isNaN(Number(choice))) {
      const index = Number(choice) - 1;
      if (index >= 0 && index < mcpNames.length) {
        const mcpName = mcpNames[index];

        console.log('');
        console.log(`Toggling MCP: ${mcpName}...`);

        try {
          await this.mcpManager.toggleMCP(selected, mcpName);
          console.log('');
          console.log('✓ MCP toggled successfully');
        } catch (error) {
          console.log('');
          console.log(`✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        console.log('');
        console.log('Press any key to return to dashboard...');
        await this.waitForKeypress();
      }
    }

    // Resume refresh
    this.startRefresh();
    await this.refresh();
  }

  /**
   * Prompt for label input
   */
  private async promptForLabel(currentLabel: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      rl.question(`\nEnter label (current: ${currentLabel || 'none'}): `, answer => {
        rl.close();

        // Sanitize and validate input
        let label = answer.trim();

        // Remove ANSI escape sequences to prevent terminal display corruption
        label = label.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

        // Enforce max length (64 chars)
        if (label.length > 64) {
          label = label.substring(0, 64);
        }

        resolve(label);
      });
    });
  }

  /**
   * Prompt for generic input
   */
  private async promptForInput(prompt: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      rl.question(prompt, answer => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  /**
   * Wait for any keypress
   */
  private async waitForKeypress(): Promise<void> {
    return new Promise(resolve => {
      const handler = () => {
        process.stdin.removeListener('data', handler);
        resolve();
      };
      process.stdin.once('data', handler);
    });
  }

  /**
   * Enter search mode
   */
  private enterSearchMode(): void {
    this.searchMode = true;
    this.searchQuery = '';
    this.render();
  }

  /**
   * Exit search mode
   */
  private exitSearchMode(): void {
    this.searchMode = false;
    this.searchQuery = '';
    this.render();
  }

  /**
   * Show help screen
   */
  private showHelp(): void {
    // Pause rendering
    this.pauseRefresh();

    console.clear();
    console.log(boxTop(70));
    console.log('  ' + colors.header('MindMux: Keyboard Shortcuts'));
    console.log(boxBottom(70));
    console.log('');
    console.log('  ' + colors.info('Navigation:'));
    console.log('    j, ↓              Move down');
    console.log('    k, ↑              Move up');
    console.log('');
    console.log('  ' + colors.info('Actions:'));
    console.log('    Enter             Attach to selected session');
    console.log('    f                 Fork session (clone with full history)');
    console.log('    m                 Manage MCP servers for session');
    console.log('    l                 Label/tag session');
    console.log('    /                 Search/filter sessions (real-time)');
    console.log('    Esc               Exit search mode');
    console.log('');
    console.log('  ' + colors.info('General:'));
    console.log('    h, ?              Show this help screen');
    console.log('    q, Ctrl+C         Quit MindMux');
    console.log('');
    console.log(boxTop(70, '├', '─', '┤'));
    console.log('  ' + colors.dim('Press any key to return to dashboard...'));
    console.log(boxBottom(70));

    // Wait for any key
    const resumeHandler = () => {
      this.keyboard.removeAllListeners();
      this.setupKeyHandlers();
      this.startRefresh();
      this.refresh();
    };

    this.keyboard.once('space', resumeHandler);
    this.keyboard.once('return', resumeHandler);
    this.keyboard.once('escape', resumeHandler);
    this.keyboard.once('h', resumeHandler);
    this.keyboard.once('?', resumeHandler);
    this.keyboard.once('q', resumeHandler);

    // Also catch any alphanumeric key
    for (let i = 97; i <= 122; i++) {
      const char = String.fromCharCode(i);
      this.keyboard.once(char, resumeHandler);
    }
  }

  /**
   * Refresh session list
   */
  private async refresh(): Promise<void> {
    // Scan for sessions
    this.sessions = await this.scanner.scan();

    // Apply search filter
    if (this.searchQuery) {
      this.sessions = this.scanner.search(this.sessions, this.searchQuery);
    }

    // Load labels
    const labels = loadLabels();
    for (const session of this.sessions) {
      const labelEntry = labels.find(l => l.sessionId === session.id);
      if (labelEntry) {
        session.label = labelEntry.label;
        // Restore active MCPs from labels
        if (labelEntry.activeMCPs) {
          session.activeMCPs = labelEntry.activeMCPs;
        }
      }
    }

    // Ensure selected index is valid
    if (this.selectedIndex >= this.sessions.length) {
      this.selectedIndex = Math.max(0, this.sessions.length - 1);
    }

    this.render();
  }

  /**
   * Render TUI
   */
  private render(): void {
    // Clear screen
    console.clear();

    // Header
    console.log(boxTop(60));
    console.log('  ' + colors.header('MindMux: AI Session Tracker'));
    console.log(boxBottom(60));
    console.log('');

    if (this.sessions.length === 0) {
      console.log('  ' + colors.dim('No AI sessions found'));
      console.log('  ' + colors.dim('Start Claude Code, Gemini CLI, or other AI tools in tmux'));
      console.log('');
    } else {
      console.log(`  Sessions (${this.sessions.length} active):\n`);

      for (let i = 0; i < this.sessions.length; i++) {
        const session = this.sessions[i];
        const isSelected = i === this.selectedIndex;
        const prefix = isSelected ? colors.info('> ') : '  ';

        const symbol = getStatusSymbol(session.status);
        const colorName = getStatusColor(session.status);
        const statusText = colors[colorName](`[${symbol}]`);

        const toolText = colors.info(session.toolType.padEnd(10));
        const pathText = colors.dim(this.truncatePath(session.projectPath, 30));
        const labelText = session.label ? colors.warning(`[${session.label}]`) : '';
        const mcpText = session.activeMCPs.length > 0
          ? colors.success(`{${session.activeMCPs.length} MCP}`)
          : '';

        console.log(`${prefix}${statusText} ${toolText} ${pathText} ${labelText} ${mcpText}`);
      }

      console.log('');
    }

    // Footer
    console.log(boxTop(70, '├', '─', '┤'));
    console.log('  ' + colors.dim('j/k: Navigate | Enter: Attach | l: Label | f: Fork | m: MCP'));
    console.log('  ' + colors.dim('/: Search | h/?: Help | q: Quit'));
    console.log(boxBottom(70));

    if (this.searchMode) {
      console.log(`\n${colors.warning('Search:')} ${this.searchQuery}_`);
    }
  }

  /**
   * Truncate path for display
   */
  private truncatePath(path: string, maxLen: number): string {
    if (path.length <= maxLen) return path;

    const parts = path.split('/');
    if (parts.length <= 2) return path.substring(0, maxLen) + '...';

    return '.../' + parts.slice(-2).join('/');
  }

  /**
   * Start auto-refresh
   */
  private startRefresh(): void {
    // Clear existing interval
    this.pauseRefresh();

    this.refreshInterval = setInterval(() => {
      this.refresh();
    }, 2000); // 2 second refresh
  }

  /**
   * Pause auto-refresh
   */
  private pauseRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.pauseRefresh();
    this.keyboard.cleanup();
  }

  /**
   * Quit dashboard
   */
  private quit(): void {
    this.cleanup();
    console.clear();
    console.log(colors.success('Goodbye!'));
    process.exit(0);
  }

  /**
   * Start dashboard
   */
  async start(): Promise<void> {
    // Initial render
    await this.refresh();

    // Start auto-refresh
    this.startRefresh();

    // Enable keyboard input
    this.keyboard.enable();
  }
}
