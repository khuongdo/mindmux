/**
 * CLI Adapter Factory
 * Factory for creating CLI adapters based on agent type
 */

import { TmuxController } from '../core/tmux-controller.js';
import { CLIAdapter } from './cli-adapter-interface.js';
import { ClaudeCLIAdapter } from './claude-cli-adapter.js';
import { OpenCodeCLIAdapter } from './opencode-cli-adapter.js';
import { GeminiCLIAdapter } from './gemini-cli-adapter.js';
import { AgentType, AgentConfig } from '../core/types.js';
import { ensureCLIInstalled } from '../utils/cli-checker.js';

export class CLIAdapterFactory {
  constructor(private tmuxController: TmuxController) {}

  /**
   * Create CLI adapter for agent type
   * Validates CLI is installed before creating
   */
  create(type: AgentType, config?: AgentConfig): CLIAdapter {
    // Validate CLI is installed
    ensureCLIInstalled(type);

    switch (type) {
      case 'claude':
        return new ClaudeCLIAdapter(this.tmuxController);

      case 'opencode':
        return new OpenCodeCLIAdapter(this.tmuxController);

      case 'gemini':
        return new GeminiCLIAdapter(
          this.tmuxController,
          config?.model || 'gemini-2-5-flash'
        );

      case 'gpt4':
        // GPT-4 uses OpenCode CLI with OpenAI provider
        return new OpenCodeCLIAdapter(this.tmuxController);

      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }

  /**
   * Check if CLI for agent type is installed
   */
  async isInstalled(type: AgentType): Promise<boolean> {
    try {
      const adapter = this.createWithoutValidation(type);
      return await adapter.checkInstalled();
    } catch {
      return false;
    }
  }

  /**
   * Get install instructions for agent type
   */
  getInstallInstructions(type: AgentType): string {
    const adapter = this.createWithoutValidation(type);
    return adapter.getInstallInstructions();
  }

  private createWithoutValidation(type: AgentType): CLIAdapter {
    switch (type) {
      case 'claude':
        return new ClaudeCLIAdapter(this.tmuxController);
      case 'opencode':
      case 'gpt4':
        return new OpenCodeCLIAdapter(this.tmuxController);
      case 'gemini':
        return new GeminiCLIAdapter(this.tmuxController);
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }
}
