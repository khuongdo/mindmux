/**
 * Claude CLI Adapter
 * Adapter for Claude Code CLI (claude command)
 */

import { TmuxController } from '../core/tmux-controller.js';
import { BaseCLIAdapter } from './base-cli-adapter.js';
import { CLIAdapterConfig } from './cli-adapter-interface.js';
import { MonitorOptions } from '../utils/output-monitor.js';

export class ClaudeCLIAdapter extends BaseCLIAdapter {
  constructor(
    tmuxController: TmuxController,
    monitorOptions?: Partial<MonitorOptions>
  ) {
    super(tmuxController, 'claude', monitorOptions);
  }

  protected buildSpawnCommand(config?: CLIAdapterConfig): string {
    let cmd = 'claude';

    // Claude Code supports --print for non-interactive mode
    // but we want interactive for session persistence

    if (config?.workDir) {
      cmd = `cd "${config.workDir}" && ${cmd}`;
    }

    return cmd;
  }

  protected async waitForCLIReady(sessionName: string): Promise<void> {
    // Claude CLI shows a prompt when ready
    // Wait for output to stabilize (CLI initialization)
    const maxWait = 10000; // 10 seconds max
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      if (await this.isIdle(sessionName)) {
        // CLI has stopped outputting, likely ready
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Continue anyway after max wait
  }

  async terminate(sessionName: string): Promise<void> {
    // Claude Code uses /exit or Ctrl+C
    await this.sendCommand(sessionName, '/exit');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
