/**
 * Agent stop command
 * Stops a running agent
 */

import { Command } from 'commander';
import { ConfigManager } from '../../core/config-manager';
import { AgentManager } from '../../core/agent-manager';
import { TmuxController } from '../../core/tmux-controller';
import { AgentLifecycle } from '../../core/agent-lifecycle';

export const stopAgentCommand = new Command('agent:stop')
  .description('Stop a running agent')
  .argument('<name>', 'Agent name')
  .option('-f, --force', 'Force kill without graceful shutdown')
  .action(async (name: string, options: { force?: boolean }) => {
    try {
      const configManager = new ConfigManager();
      const agentManager = new AgentManager(configManager);
      const tmuxController = new TmuxController();
      const lifecycle = new AgentLifecycle(tmuxController, agentManager);

      // Initialize tmux controller
      await tmuxController.initialize();

      // Get agent by name
      const agent = agentManager.getAgentByName(name);
      if (!agent) {
        console.error(`Error: Agent "${name}" not found`);
        console.log('\nAvailable agents:');
        const agents = agentManager.listAgents();
        if (agents.length === 0) {
          console.log('  No agents created yet. Use "mux agent:create" to create one.');
        } else {
          agents.forEach(a => console.log(`  - ${a.name} (${a.type})`));
        }
        process.exit(1);
      }

      // Check if agent is running
      if (!agent.isRunning || !agent.sessionName) {
        console.log(`Agent "${agent.name}" is not running`);
        process.exit(0);
      }

      // Stop agent
      console.log(`Stopping agent "${agent.name}"...`);
      if (options.force) {
        console.log('  Force killing session...');
        await tmuxController.killSession(agent.sessionName);
        agent.isRunning = false;
        agent.status = 'idle';
        agentManager.updateAgent(agent);
      } else {
        await lifecycle.stopAgent(agent.id);
      }

      console.log(`\nAgent stopped successfully!`);
      console.log(`  Status: ${agent.status}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
