/**
 * Task assign command
 * Assign task to agent and execute with streaming output
 */

import { Command } from 'commander';
import { ConfigManager } from '../../core/config-manager';
import { AgentManager } from '../../core/agent-manager';
import { TmuxController } from '../../core/tmux-controller';
import { AgentLifecycle } from '../../core/agent-lifecycle';

export const assignTaskCommand = new Command('task:assign')
  .description('Assign task to agent and execute')
  .argument('<agent-name>', 'Agent name or ID')
  .argument('<prompt>', 'Task prompt/instruction')
  .option('-t, --timeout <ms>', 'Task timeout in milliseconds', '300000')
  .action(async (agentIdentifier: string, prompt: string, options) => {
    try {
      // Initialize managers
      const configManager = new ConfigManager();
      const agentManager = new AgentManager(configManager);
      const tmuxController = new TmuxController();
      const lifecycle = new AgentLifecycle(tmuxController, agentManager);

      // Find agent by name or ID
      let agent = agentManager.getAgent(agentIdentifier);
      if (!agent) {
        agent = agentManager.getAgentByName(agentIdentifier);
      }

      if (!agent) {
        console.error(`Error: Agent "${agentIdentifier}" not found`);
        console.error('Run "mux agent:list" to see available agents');
        process.exit(1);
      }

      // Check if agent is running
      if (!agent.isRunning || !agent.sessionName) {
        console.error(`Error: Agent "${agent.name}" is not running`);
        console.error(`Run "mux agent:start ${agent.name}" to start the agent`);
        process.exit(1);
      }

      console.log(`Assigning task to agent "${agent.name}" (${agent.type})...`);
      console.log(`Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
      console.log('');

      // Execute task with timeout
      const timeoutMs = parseInt(options.timeout, 10);
      const taskPromise = lifecycle.executeTask(agent.id, prompt);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Task timeout after ${timeoutMs}ms`)), timeoutMs);
      });

      const task = await Promise.race([taskPromise, timeoutPromise]);

      console.log('✓ Task completed successfully');
      console.log(`  Task ID: ${task.id}`);
      console.log(`  Status: ${task.status}`);
      console.log(`  Duration: ${calculateDuration(task.startedAt!, task.completedAt!)}`);
      console.log('');
      console.log('Result preview:');
      console.log(task.result?.substring(0, 500) || '(no result)');
      console.log('');
      console.log(`View full output with: mux agent:logs ${agent.name}`);

      process.exit(0);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error(`Error: ${error}`);
      }
      process.exit(1);
    }
  });

/**
 * Calculate duration between two ISO timestamps
 */
function calculateDuration(start: string, end: string): string {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const durationMs = endTime - startTime;

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  } else if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = ((durationMs % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}
