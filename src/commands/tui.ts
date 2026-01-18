/**
 * TUI command for launching terminal UI
 */

import { Command } from 'commander';
import { TUIManager } from '../tui/index.js';

export const tuiCommand = new Command('tui')
  .description('Launch terminal UI for managing agents')
  .option('-r, --refresh <ms>', 'Refresh interval in milliseconds', '1000')
  .action(async (options) => {
    const refreshInterval = parseInt(options.refresh, 10);

    const tui = new TUIManager({
      title: 'MindMux - Multi-Agent Orchestration',
      refreshInterval,
    });

    tui.start();
  });
