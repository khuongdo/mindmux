/**
 * CLI Adapter Interface
 * Unified interface for controlling AI CLI tools via tmux
 */

import { AgentType } from '../core/types.js';

export interface CLIAdapterConfig {
  workDir?: string;          // Working directory for CLI
  timeout?: number;          // Command timeout in ms
  pollIntervalMs?: number;   // Output polling interval
  idleThresholdMs?: number;  // Time to wait before considering response complete
}

export interface CLIResponse {
  success: boolean;
  output: string;
  durationMs: number;
  error?: string;
}

export interface CLIAdapter {
  /**
   * Agent type this adapter handles
   */
  readonly type: AgentType;

  /**
   * CLI command name (e.g., 'claude', 'opencode', 'gemini')
   */
  readonly command: string;

  /**
   * Check if CLI tool is installed
   */
  checkInstalled(): Promise<boolean>;

  /**
   * Get installation instructions
   */
  getInstallInstructions(): string;

  /**
   * Spawn CLI process in tmux session
   * Called after TmuxController.createSession()
   */
  spawnProcess(sessionName: string, config?: CLIAdapterConfig): Promise<void>;

  /**
   * Send prompt to CLI and wait for response
   */
  sendPrompt(
    sessionName: string,
    prompt: string,
    config?: CLIAdapterConfig
  ): Promise<CLIResponse>;

  /**
   * Send raw command to CLI (for special commands like /exit)
   */
  sendCommand(sessionName: string, command: string): Promise<void>;

  /**
   * Check if CLI is ready for input (idle state)
   */
  isIdle(sessionName: string): Promise<boolean>;

  /**
   * Get current output from CLI pane
   */
  getOutput(sessionName: string, lines?: number): Promise<string>;

  /**
   * Gracefully terminate CLI process
   */
  terminate(sessionName: string): Promise<void>;
}
