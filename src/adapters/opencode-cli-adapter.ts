/**
 * OpenCode CLI Adapter
 * Adapter for OpenCode CLI (opencode command)
 */

import { TmuxController } from '../core/tmux-controller';
import { BaseCLIAdapter } from './base-cli-adapter';
import { CLIAdapterConfig } from './cli-adapter-interface';
import { MonitorOptions } from '../utils/output-monitor';

export class OpenCodeCLIAdapter extends BaseCLIAdapter {
  constructor(
    tmuxController: TmuxController,
    monitorOptions?: Partial<MonitorOptions>
  ) {
    super(tmuxController, 'opencode', monitorOptions);
  }

  protected buildSpawnCommand(config?: CLIAdapterConfig): string {
    let cmd = 'opencode';

    if (config?.workDir) {
      cmd = `cd "${config.workDir}" && ${cmd}`;
    }

    return cmd;
  }

  protected async waitForCLIReady(sessionName: string): Promise<void> {
    // OpenCode shows prompt when ready
    const maxWait = 10000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      if (await this.isIdle(sessionName)) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async terminate(sessionName: string): Promise<void> {
    await this.sendCommand(sessionName, '/exit');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
