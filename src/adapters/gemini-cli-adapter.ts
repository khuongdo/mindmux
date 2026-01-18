/**
 * Gemini CLI Adapter
 * Adapter for Gemini CLI (gemini command)
 */

import { TmuxController } from '../core/tmux-controller.js';
import { BaseCLIAdapter } from './base-cli-adapter.js';
import { CLIAdapterConfig } from './cli-adapter-interface.js';
import { MonitorOptions } from '../utils/output-monitor.js';

export class GeminiCLIAdapter extends BaseCLIAdapter {
  private model: string;

  constructor(
    tmuxController: TmuxController,
    model: string = 'gemini-2-5-flash',
    monitorOptions?: Partial<MonitorOptions>
  ) {
    super(tmuxController, 'gemini', monitorOptions);
    this.model = model;
  }

  protected buildSpawnCommand(config?: CLIAdapterConfig): string {
    // Gemini CLI uses -m flag for model selection
    let cmd = `gemini -m ${this.model}`;

    if (config?.workDir) {
      cmd = `cd "${config.workDir}" && ${cmd}`;
    }

    return cmd;
  }

  protected async waitForCLIReady(sessionName: string): Promise<void> {
    // Gemini CLI shows prompt when ready
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
    // Gemini uses /exit or /quit
    await this.sendCommand(sessionName, '/exit');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
