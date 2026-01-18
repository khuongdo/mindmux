/**
 * Task Executor (REVISED)
 * Executes tasks by sending prompts to CLI tools via tmux
 */

import { TmuxController } from './tmux-controller.js';
import { CLIAdapterFactory } from '../adapters/cli-adapter-factory.js';
import { Agent, Task } from './types.js';

export class TaskExecutor {
  private adapterFactory: CLIAdapterFactory;

  constructor(private tmuxController: TmuxController) {
    this.adapterFactory = new CLIAdapterFactory(tmuxController);
  }

  /**
   * Execute a task on an agent via CLI
   */
  async executeTask(agent: Agent, task: Task): Promise<string> {
    if (!agent.sessionName || !agent.isRunning) {
      throw new Error(`Agent ${agent.name} is not running`);
    }

    try {
      // Get CLI adapter for agent type
      const adapter = this.adapterFactory.create(agent.type, agent.config);

      // Send prompt and wait for response
      const response = await adapter.sendPrompt(
        agent.sessionName,
        task.prompt,
        {
          workDir: process.cwd(),
          timeout: task.timeout || 300000,
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'CLI response failed');
      }

      return response.output;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Task execution failed: ${errorMessage}`);
    }
  }

  /**
   * Spawn CLI process for agent
   */
  async spawnCLI(agent: Agent): Promise<void> {
    if (!agent.sessionName) {
      throw new Error(`Agent ${agent.name} has no session`);
    }

    const adapter = this.adapterFactory.create(agent.type, agent.config);

    await adapter.spawnProcess(agent.sessionName, {
      workDir: process.cwd(),
    });
  }

  /**
   * Check if CLI is ready for commands
   */
  async isCLIReady(agent: Agent): Promise<boolean> {
    if (!agent.sessionName || !agent.isRunning) {
      return false;
    }

    const adapter = this.adapterFactory.create(agent.type, agent.config);
    return await adapter.isIdle(agent.sessionName);
  }

  /**
   * Terminate CLI process for agent
   */
  async terminateCLI(agent: Agent): Promise<void> {
    if (!agent.sessionName) {
      return;
    }

    const adapter = this.adapterFactory.create(agent.type, agent.config);
    await adapter.terminate(agent.sessionName);
  }
}
