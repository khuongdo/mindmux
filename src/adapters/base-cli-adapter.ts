/**
 * Base CLI Adapter
 * Shared implementation for all CLI adapters
 */

import { TmuxController } from '../core/tmux-controller.js';
import { OutputMonitor, MonitorOptions } from '../utils/output-monitor.js';
import { checkCLIInstalled, getCLICommand } from '../utils/cli-checker.js';
import { CLIAdapter, CLIAdapterConfig, CLIResponse } from './cli-adapter-interface.js';
import { AgentType } from '../core/types.js';

export abstract class BaseCLIAdapter implements CLIAdapter {
  protected outputMonitor: OutputMonitor;

  constructor(
    protected tmuxController: TmuxController,
    public readonly type: AgentType,
    monitorOptions?: Partial<MonitorOptions>
  ) {
    this.outputMonitor = new OutputMonitor(tmuxController, {
      pollIntervalMs: monitorOptions?.pollIntervalMs ?? 500,
      idleThresholdMs: monitorOptions?.idleThresholdMs ?? 2000,
      timeoutMs: monitorOptions?.timeoutMs ?? 300000,
    });
  }

  get command(): string {
    return getCLICommand(this.type);
  }

  async checkInstalled(): Promise<boolean> {
    const info = checkCLIInstalled(this.type);
    return info.installed;
  }

  getInstallInstructions(): string {
    const info = checkCLIInstalled(this.type);
    return info.installInstructions;
  }

  /**
   * Spawn CLI process - override in subclass for tool-specific args
   */
  async spawnProcess(
    sessionName: string,
    config?: CLIAdapterConfig
  ): Promise<void> {
    // Build spawn command
    const spawnCmd = this.buildSpawnCommand(config);

    // Send command to start CLI
    await this.tmuxController.sendCommand(sessionName, spawnCmd);

    // Wait for CLI to initialize
    await this.waitForCLIReady(sessionName);
  }

  /**
   * Build the command to spawn CLI - override for tool-specific args
   */
  protected buildSpawnCommand(config?: CLIAdapterConfig): string {
    let cmd = this.command;

    if (config?.workDir) {
      cmd = `cd "${config.workDir}" && ${cmd}`;
    }

    return cmd;
  }

  /**
   * Wait for CLI to be ready - override for tool-specific prompt detection
   */
  protected async waitForCLIReady(sessionName: string): Promise<void> {
    // Default: wait 3 seconds for CLI to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  async sendPrompt(
    sessionName: string,
    prompt: string,
    config?: CLIAdapterConfig
  ): Promise<CLIResponse> {
    try {
      // Capture output before sending (to extract only new content)
      const beforeOutput = await this.getOutput(sessionName, 500);

      // Escape and send prompt
      const escapedPrompt = this.escapePrompt(prompt);
      await this.tmuxController.sendCommand(sessionName, escapedPrompt);

      // Wait for response to complete
      const result = await this.outputMonitor.waitForCompletion(sessionName);

      if (result.status === 'timeout') {
        return {
          success: false,
          output: result.output,
          durationMs: result.durationMs,
          error: 'Response timeout',
        };
      }

      if (result.status === 'error') {
        return {
          success: false,
          output: '',
          durationMs: result.durationMs,
          error: result.output,
        };
      }

      // Extract only the new output (after the prompt)
      const responseOutput = this.extractResponse(
        beforeOutput,
        result.output,
        prompt
      );

      return {
        success: true,
        output: responseOutput,
        durationMs: result.durationMs,
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        durationMs: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async sendCommand(sessionName: string, command: string): Promise<void> {
    await this.tmuxController.sendCommand(sessionName, command);
  }

  async isIdle(sessionName: string): Promise<boolean> {
    // Take two snapshots 500ms apart, compare
    const snapshot1 = await this.outputMonitor.getSnapshot(sessionName);
    await new Promise(resolve => setTimeout(resolve, 500));
    const snapshot2 = await this.outputMonitor.getSnapshot(sessionName);

    return snapshot1 === snapshot2;
  }

  async getOutput(sessionName: string, lines: number = 500): Promise<string> {
    return await this.outputMonitor.getSnapshot(sessionName, lines);
  }

  async terminate(sessionName: string): Promise<void> {
    // Send exit command to CLI
    await this.sendCommand(sessionName, 'exit');

    // Wait briefly for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Escape prompt for shell transmission
   */
  protected escapePrompt(prompt: string): string {
    // Handle multi-line prompts
    if (prompt.includes('\n')) {
      // Use heredoc for multi-line
      return `cat << 'MINDMUX_PROMPT_EOF'\n${prompt}\nMINDMUX_PROMPT_EOF`;
    }

    // Single line - escape special characters
    return prompt
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/`/g, '\\`');
  }

  /**
   * Extract response from captured output
   * Removes the echoed prompt and previous content
   */
  protected extractResponse(
    beforeOutput: string,
    afterOutput: string,
    prompt: string
  ): string {
    // Simple approach: remove beforeOutput prefix
    // More sophisticated: find prompt echo and extract after

    const beforeLines = beforeOutput.split('\n').length;
    const afterLines = afterOutput.split('\n');

    // Skip lines that were present before + prompt line
    const newLines = afterLines.slice(beforeLines + 1);

    return newLines.join('\n').trim();
  }
}
