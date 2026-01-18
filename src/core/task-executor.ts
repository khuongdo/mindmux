/**
 * Task Executor
 * Executes AI tasks on agents with streaming output to tmux sessions
 */

import { AIProviderFactory } from '../providers/factory';
import { TmuxController } from './tmux-controller';
import { Agent, Task } from './types';

export class TaskExecutor {
  constructor(private tmuxController: TmuxController) {}

  /**
   * Execute a task on an agent with streaming output
   */
  async executeTask(agent: Agent, task: Task): Promise<string> {
    try {
      const provider = AIProviderFactory.create(agent.type, agent.config);

      // Ensure agent has an active session
      if (!agent.sessionName || !agent.isRunning) {
        throw new Error(`Agent ${agent.name} is not running`);
      }

      const sessionName = agent.sessionName;
      let fullResponse = '';

      // Clear previous output
      await this.tmuxController.sendCommand(sessionName, 'clear');

      // Show task info
      await this.tmuxController.sendCommand(
        sessionName,
        `echo "Task ID: ${task.id}"`
      );
      await this.tmuxController.sendCommand(
        sessionName,
        `echo "Prompt: ${task.prompt.substring(0, 100)}..."`
      );
      await this.tmuxController.sendCommand(
        sessionName,
        'echo "---"'
      );

      // Stream AI response to tmux session
      await provider.stream(
        task.prompt,
        (chunk: string) => {
          fullResponse += chunk;
          // Escape special characters for shell
          const escapedChunk = chunk.replace(/"/g, '\\"').replace(/\$/g, '\\$');
          this.tmuxController.sendCommand(sessionName, `printf "%s" "${escapedChunk}"`);
        }
      );

      // Mark task complete
      await this.tmuxController.sendCommand(
        sessionName,
        'echo ""'
      );
      await this.tmuxController.sendCommand(
        sessionName,
        'echo "---"'
      );
      await this.tmuxController.sendCommand(
        sessionName,
        'echo "Task completed"'
      );

      return fullResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Task execution failed: ${errorMessage}`);
    }
  }
}
