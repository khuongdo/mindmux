/**
 * Output Monitor
 * Polls tmux pane content to detect when CLI response is complete
 */

import { TmuxController } from '../core/tmux-controller';
import { hashContent, cleanTerminalOutput } from './content-hasher';

export interface MonitorOptions {
  pollIntervalMs: number;    // How often to check (default: 500ms)
  idleThresholdMs: number;   // How long unchanged = complete (default: 2000ms)
  timeoutMs: number;         // Max wait time (default: 300000ms / 5 min)
}

const DEFAULT_OPTIONS: MonitorOptions = {
  pollIntervalMs: 500,
  idleThresholdMs: 2000,
  timeoutMs: 300000,
};

export interface MonitorResult {
  status: 'complete' | 'timeout' | 'error';
  output: string;
  durationMs: number;
}

export class OutputMonitor {
  constructor(
    private tmuxController: TmuxController,
    private options: MonitorOptions = DEFAULT_OPTIONS
  ) {}

  /**
   * Wait for CLI output to stabilize (no changes for idleThreshold)
   */
  async waitForCompletion(
    sessionName: string,
    captureLines: number = 500
  ): Promise<MonitorResult> {
    const startTime = Date.now();
    let lastHash = '';
    let lastChangeTime = startTime;
    let lastOutput = '';

    while (true) {
      const elapsed = Date.now() - startTime;

      // Check timeout
      if (elapsed > this.options.timeoutMs) {
        return {
          status: 'timeout',
          output: lastOutput,
          durationMs: elapsed,
        };
      }

      try {
        // Capture current pane content
        const rawOutput = await this.tmuxController.captureOutput(
          sessionName,
          captureLines
        );
        const cleanedOutput = cleanTerminalOutput(rawOutput);
        const currentHash = hashContent(cleanedOutput);

        // Check if content changed
        if (currentHash !== lastHash) {
          lastHash = currentHash;
          lastChangeTime = Date.now();
          lastOutput = cleanedOutput;
        } else {
          // Content unchanged - check if idle long enough
          const idleTime = Date.now() - lastChangeTime;
          if (idleTime >= this.options.idleThresholdMs) {
            return {
              status: 'complete',
              output: lastOutput,
              durationMs: elapsed,
            };
          }
        }

        // Wait before next poll
        await this.sleep(this.options.pollIntervalMs);

      } catch (error) {
        return {
          status: 'error',
          output: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - startTime,
        };
      }
    }
  }

  /**
   * Get current snapshot of pane content
   */
  async getSnapshot(
    sessionName: string,
    lines: number = 500
  ): Promise<string> {
    const raw = await this.tmuxController.captureOutput(sessionName, lines);
    return cleanTerminalOutput(raw);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
