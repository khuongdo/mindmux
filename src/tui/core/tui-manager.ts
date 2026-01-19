/**
 * Main TUI controller
 */

import { ScreenBuffer } from './screen-buffer.js';
import { KeyboardHandler } from './keyboard-handler.js';
import { colors } from '../utils/colors.js';
import { boxTop, boxBottom, boxLine, center } from '../utils/formatters.js';
import { AgentManager } from '../../core/agent-manager.js';
import { AgentLifecycle } from '../../core/agent-lifecycle.js';
import { renderSessionList } from '../components/session-list.js';
import { renderAgentDetail } from '../components/agent-detail.js';
import { renderGroupedList } from '../components/grouped-list.js';
import { renderCreationWizard, WizardState, AVAILABLE_TYPES, AVAILABLE_MODELS, AVAILABLE_CAPABILITIES } from '../components/creation-wizard.js';
import { Agent } from '../../core/types.js';

export interface TUIOptions {
  title?: string;
  refreshInterval?: number;
  agentManager: AgentManager;
  agentLifecycle: AgentLifecycle;
}

export class TUIManager {
  private screen: ScreenBuffer;
  private keyboard: KeyboardHandler;
  private running = false;
  private refreshTimer?: NodeJS.Timeout;
  private options: Required<TUIOptions>;
  private selectedIndex = 0;
  private viewMode: 'list' | 'detail' | 'logs' | 'search' | 'grouped' | 'wizard' = 'list';
  private selectedAgent: Agent | null = null;
  private refreshPaused = false;
  private searchQuery = '';
  private logLines: string[] = [];
  private groupBy: 'type' | 'capability' | 'status' = 'type';
  private wizardState: WizardState = {
    step: 0,
    name: '',
    type: AVAILABLE_TYPES[0],
    capabilities: [],
    model: AVAILABLE_MODELS[0],
  };
  private wizardSelectedIndex = 0;

  constructor(options: TUIOptions) {
    this.screen = new ScreenBuffer();
    this.keyboard = new KeyboardHandler();
    this.options = {
      title: options.title || 'MindMux TUI',
      refreshInterval: options.refreshInterval || 1000,
      agentManager: options.agentManager,
      agentLifecycle: options.agentLifecycle,
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
    this.keyboard.on('backspace', () => this.handleBackspace());

    // Controls
    this.keyboard.on('r', () => this.toggleRefresh());
    this.keyboard.on('q', () => this.quit());
    this.keyboard.on('ctrl+c', () => this.quit());
    this.keyboard.on('h', () => this.showHelp());
    this.keyboard.on('?', () => this.showHelp());

    // Phase 5.4: Interactive features
    this.keyboard.on('s', () => this.startAgent());
    this.keyboard.on('x', () => this.stopAgent());
    this.keyboard.on('l', () => this.viewLogs());
    this.keyboard.on('/', () => this.enterSearchMode());

    // Phase 5.5: Advanced features
    this.keyboard.on('g', () => this.toggleGroupView());
    this.keyboard.on('n', () => this.startCreationWizard());
    this.keyboard.on('space', () => this.handleWizardSpace());
  }

  /**
   * Handle key based on current view mode
   */
  private handleKey(action: string): void {
    if (this.viewMode === 'detail' || this.viewMode === 'logs') {
      // In detail/logs view, back returns to previous view
      if (action === 'back' || action === 'select') {
        this.viewMode = 'list';
        this.selectedAgent = null;
        this.logLines = [];
        this.render();
      }
    } else if (this.viewMode === 'search') {
      // In search mode
      if (action === 'back') {
        this.viewMode = 'list';
        this.searchQuery = '';
        this.keyboard.disableTextInput();
        this.render();
      }
    } else if (this.viewMode === 'grouped') {
      // In grouped view, back returns to list
      if (action === 'back') {
        this.viewMode = 'list';
        this.render();
      } else if (action === 'navigate-down') {
        this.navigateDown();
      } else if (action === 'navigate-up') {
        this.navigateUp();
      } else if (action === 'select') {
        this.viewAgentDetail();
      }
    } else if (this.viewMode === 'wizard') {
      // In wizard mode
      if (action === 'back') {
        this.viewMode = 'list';
        this.keyboard.disableTextInput();
        this.resetWizard();
        this.render();
      } else if (action === 'navigate-down') {
        this.handleWizardNavigation(1);
      } else if (action === 'navigate-up') {
        this.handleWizardNavigation(-1);
      } else if (action === 'select') {
        this.advanceWizardStep();
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
   * Handle backspace key
   */
  private handleBackspace(): void {
    if (this.viewMode === 'search' || this.viewMode === 'wizard') {
      // Delete last character in search query or wizard name
      if (this.viewMode === 'search' && this.searchQuery.length > 0) {
        this.searchQuery = this.searchQuery.slice(0, -1);
        this.render();
      } else if (this.viewMode === 'wizard' && this.wizardState.step === 0 && this.wizardState.name.length > 0) {
        this.wizardState.name = this.wizardState.name.slice(0, -1);
        this.render();
      }
    } else {
      // Default: treat as back
      this.handleKey('back');
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
    } else if (this.viewMode === 'logs' && this.selectedAgent) {
      // Logs view
      this.screen.writeLine('');
      this.screen.writeLine(colors.header(center(`Logs: ${this.selectedAgent.name}`, width)));
      this.screen.writeLine(colors.dim('─'.repeat(width)));
      this.screen.writeLine('');

      this.logLines.forEach(line => this.screen.writeLine(`  ${line}`));

      this.screen.writeLine('');
      this.screen.writeLine(colors.dim('─'.repeat(width)));
      this.screen.writeLine(colors.dim(center('Press Esc to return', width)));
      this.screen.writeLine('');
    } else if (this.viewMode === 'search') {
      // Search view
      this.screen.writeLine('');
      this.screen.writeLine(colors.header(center('Search Agents', width)));
      this.screen.writeLine(colors.dim('─'.repeat(width)));
      this.screen.writeLine('');
      this.screen.writeLine(`  Search: ${this.searchQuery}_`);
      this.screen.writeLine('');

      const filteredAgents = this.getFilteredAgents();
      if (filteredAgents.length > 0) {
        const sessionLines = renderSessionList(filteredAgents, {
          width,
          selectedIndex: -1,
        });
        sessionLines.forEach(line => this.screen.writeLine(line));
      } else {
        this.screen.writeLine(colors.dim('  No agents match your search'));
        this.screen.writeLine('');
      }

      this.screen.writeLine(colors.dim('─'.repeat(width)));
      this.screen.writeLine(colors.dim(center('Type to search | Esc to cancel', width)));
      this.screen.writeLine('');
    } else if (this.viewMode === 'grouped') {
      // Grouped view (Phase 5.5)
      const agents = this.options.agentManager.listAgents();
      const groupedLines = renderGroupedList(agents, {
        width,
        selectedIndex: this.selectedIndex,
        groupBy: this.groupBy,
      });

      groupedLines.forEach(line => this.screen.writeLine(line));

      const footer = `j/k: nav | Enter: view | g: toggle group | Esc: back | q: quit`;
      this.screen.writeLine(colors.border(boxTop(width)));
      this.screen.writeLine(
        colors.border(boxLine(colors.dim(footer), width))
      );
    } else if (this.viewMode === 'wizard') {
      // Wizard view (Phase 5.5)
      const wizardLines = renderCreationWizard(this.wizardState, width, this.wizardSelectedIndex);
      wizardLines.forEach(line => this.screen.writeLine(line));
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
      const footer = `j/k: nav | Enter: view | s: start | x: stop | l: logs | /: search | g: group | n: new | h: help | q: quit ${refreshStatus}`;

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
    this.screen.writeLine('  Navigation:');
    this.screen.writeLine('  j, ↓       - Navigate down');
    this.screen.writeLine('  k, ↑       - Navigate up');
    this.screen.writeLine('  Enter      - View agent details');
    this.screen.writeLine('  Esc, ←     - Back to list');
    this.screen.writeLine('');
    this.screen.writeLine('  Agent Control:');
    this.screen.writeLine('  s          - Start selected agent');
    this.screen.writeLine('  x          - Stop selected agent');
    this.screen.writeLine('  l          - View agent logs');
    this.screen.writeLine('');
    this.screen.writeLine('  Views & Organization:');
    this.screen.writeLine('  /          - Search/filter agents');
    this.screen.writeLine('  g          - Toggle grouped view');
    this.screen.writeLine('  n          - Create new agent (wizard)');
    this.screen.writeLine('');
    this.screen.writeLine('  Other:');
    this.screen.writeLine('  r          - Toggle auto-refresh');
    this.screen.writeLine('  h, ?       - Show this help');
    this.screen.writeLine('  q, Ctrl+C  - Quit');
    this.screen.writeLine('');
    this.screen.writeLine(colors.border(boxTop(width)));
    this.screen.writeLine(
      colors.border(boxLine(colors.dim('Phase 5.5 - Advanced Features'), width))
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

  /**
   * Phase 5.4: Start selected agent
   */
  private async startAgent(): Promise<void> {
    if (this.viewMode !== 'list') return;

    const agents = this.options.agentManager.listAgents();
    if (agents.length === 0 || this.selectedIndex >= agents.length) return;

    const agent = agents[this.selectedIndex];

    try {
      await this.options.agentLifecycle.startAgent(agent.id);
      this.render();
    } catch (error) {
      // Error handling - could add error display in future
      this.render();
    }
  }

  /**
   * Phase 5.4: Stop selected agent
   */
  private async stopAgent(): Promise<void> {
    if (this.viewMode !== 'list') return;

    const agents = this.options.agentManager.listAgents();
    if (agents.length === 0 || this.selectedIndex >= agents.length) return;

    const agent = agents[this.selectedIndex];

    try {
      await this.options.agentLifecycle.stopAgent(agent.id);
      this.render();
    } catch (error) {
      // Error handling - could add error display in future
      this.render();
    }
  }

  /**
   * Phase 5.4: View logs for selected agent
   */
  private async viewLogs(): Promise<void> {
    if (this.viewMode !== 'list') return;

    const agents = this.options.agentManager.listAgents();
    if (agents.length === 0 || this.selectedIndex >= agents.length) return;

    const agent = agents[this.selectedIndex];
    this.selectedAgent = agent;

    try {
      // Get agent logs using AgentLifecycle
      const logsOutput = await this.options.agentLifecycle.getAgentLogs(agent.id, 50);
      this.logLines = logsOutput.split('\n');
      this.viewMode = 'logs';
      this.render();
    } catch (error) {
      // Fallback if logs not available
      this.logLines = [
        `Logs for agent: ${agent.name}`,
        `Session: ${agent.sessionName || 'N/A'}`,
        `Status: ${agent.status}`,
        '',
        'No logs available or agent not running',
      ];
      this.viewMode = 'logs';
      this.render();
    }
  }

  /**
   * Phase 5.4: Enter search mode
   */
  private enterSearchMode(): void {
    if (this.viewMode !== 'list') return;

    this.viewMode = 'search';
    this.searchQuery = '';

    // Enable text input for search
    this.keyboard.enableTextInput((char) => {
      this.searchQuery += char;
      this.render();
    });

    this.render();
  }

  /**
   * Get filtered agents based on search query
   */
  private getFilteredAgents(): Agent[] {
    const agents = this.options.agentManager.listAgents();

    if (!this.searchQuery || this.viewMode !== 'search') {
      return agents;
    }

    const query = this.searchQuery.toLowerCase();
    return agents.filter(agent =>
      agent.name.toLowerCase().includes(query) ||
      agent.type.toLowerCase().includes(query) ||
      agent.capabilities.some(cap => cap.toLowerCase().includes(query))
    );
  }

  /**
   * Phase 5.5: Toggle grouped view
   */
  private toggleGroupView(): void {
    if (this.viewMode !== 'list' && this.viewMode !== 'grouped') return;

    if (this.viewMode === 'list') {
      this.viewMode = 'grouped';
    } else {
      // Cycle through grouping options
      if (this.groupBy === 'type') {
        this.groupBy = 'capability';
      } else if (this.groupBy === 'capability') {
        this.groupBy = 'status';
      } else {
        this.viewMode = 'list';
        this.groupBy = 'type';
      }
    }

    this.render();
  }

  /**
   * Phase 5.5: Start creation wizard
   */
  private startCreationWizard(): void {
    if (this.viewMode !== 'list') return;

    this.resetWizard();
    this.viewMode = 'wizard';

    // Enable text input for step 0 (name input)
    this.keyboard.enableTextInput((char) => {
      if (this.wizardState.step === 0) {
        this.wizardState.name += char;
        this.render();
      }
    });

    this.render();
  }

  /**
   * Phase 5.5: Reset wizard state
   */
  private resetWizard(): void {
    this.wizardState = {
      step: 0,
      name: '',
      type: AVAILABLE_TYPES[0],
      capabilities: [],
      model: AVAILABLE_MODELS[0],
    };
    this.wizardSelectedIndex = 0;
  }

  /**
   * Phase 5.5: Handle wizard navigation (up/down arrows)
   */
  private handleWizardNavigation(direction: number): void {
    const { step } = this.wizardState;

    if (step === 1) {
      // Navigate types
      const currentIndex = AVAILABLE_TYPES.indexOf(this.wizardState.type);
      const newIndex = Math.max(0, Math.min(AVAILABLE_TYPES.length - 1, currentIndex + direction));
      this.wizardState.type = AVAILABLE_TYPES[newIndex];
      this.render();
    } else if (step === 2) {
      // Navigate capabilities
      this.wizardSelectedIndex = Math.max(0, Math.min(AVAILABLE_CAPABILITIES.length - 1, this.wizardSelectedIndex + direction));
      this.render();
    } else if (step === 3) {
      // Navigate models
      const currentIndex = AVAILABLE_MODELS.indexOf(this.wizardState.model);
      const newIndex = Math.max(0, Math.min(AVAILABLE_MODELS.length - 1, currentIndex + direction));
      this.wizardState.model = AVAILABLE_MODELS[newIndex];
      this.render();
    }
  }

  /**
   * Phase 5.5: Handle space key in wizard (toggle capabilities)
   */
  private handleWizardSpace(): void {
    if (this.viewMode !== 'wizard' || this.wizardState.step !== 2) return;

    const capability = AVAILABLE_CAPABILITIES[this.wizardSelectedIndex];
    const index = this.wizardState.capabilities.indexOf(capability);

    if (index >= 0) {
      // Remove capability
      this.wizardState.capabilities.splice(index, 1);
    } else {
      // Add capability
      this.wizardState.capabilities.push(capability);
    }

    this.render();
  }

  /**
   * Phase 5.5: Advance wizard to next step or create agent
   */
  private async advanceWizardStep(): Promise<void> {
    const { step, name } = this.wizardState;

    // Validate current step
    if (step === 0 && name.trim().length === 0) {
      // Name is required
      return;
    }

    if (step < 4) {
      // Advance to next step
      this.wizardState.step++;
      this.wizardSelectedIndex = 0;

      // Disable text input after name step
      if (step === 0) {
        this.keyboard.disableTextInput();
      }

      this.render();
    } else {
      // Final step - create agent
      try {
        this.options.agentManager.createAgent(
          this.wizardState.name.trim(),
          this.wizardState.type as any, // AgentType
          this.wizardState.capabilities,
          {
            model: this.wizardState.model,
          }
        );

        // Success - return to list
        this.viewMode = 'list';
        this.keyboard.disableTextInput();
        this.resetWizard();
        this.render();
      } catch (error) {
        // Error creating agent - stay in wizard
        // Could add error display in future
        this.render();
      }
    }
  }
}
