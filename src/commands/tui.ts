/**
 * TUI launch command
 */

import { Command } from 'commander';

export const tuiCommand = new Command('tui')
  .description('Launch interactive Terminal UI')
  .option('-r, --refresh <ms>', 'Refresh interval in milliseconds', '1000')
  .action(async (options) => {
    // Dynamic import to avoid loading React when not needed
    const { render } = await import('ink');
    const React = await import('react');
    const { App } = await import('../tui/app');

    // Set refresh interval from options
    process.env.MINDMUX_TUI_REFRESH = options.refresh;

    // Render the TUI
    const { waitUntilExit } = render(React.createElement(App));

    // Wait for TUI to exit
    await waitUntilExit();
  });
