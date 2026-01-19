/**
 * TUI command for launching terminal UI
 */

import { Command } from 'commander';
import { TUIManager } from '../tui/index.js';
import { ConfigManager } from '../core/config-manager.js';
import { AgentManager } from '../core/agent-manager.js';
import { AgentLifecycle } from '../core/agent-lifecycle.js';
import { TmuxController } from '../core/tmux-controller.js';

export const tuiCommand = new Command('tui')
  .description('Launch terminal UI for managing agents')
  .option('-r, --refresh <ms>', 'Refresh interval in milliseconds', '1000')
  .action(async (options) => {
    const refreshInterval = parseInt(options.refresh, 10);

    // Initialize managers in correct order (avoiding circular dependencies)
    const configManager = new ConfigManager();
    const agentManager = new AgentManager(configManager);
    const tmuxController = new TmuxController();
    const agentLifecycle = new AgentLifecycle(
      tmuxController,
      agentManager
    );

    const tui = new TUIManager({
      title: 'MindMux - Multi-Agent Orchestration',
      refreshInterval,
      agentManager,
      agentLifecycle,
    });

    tui.start();
  });
