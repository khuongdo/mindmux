/**
 * Agent start command
 * Starts an agent in a tmux session
 */

import { Command } from 'commander';
import { ConfigManager } from '../../core/config-manager';
import { AgentManager } from '../../core/agent-manager';
import { TmuxController } from '../../core/tmux-controller';
import { AgentLifecycle } from '../../core/agent-lifecycle';

export const startAgentCommand = new Command('agent:start')
  .description('Start an agent in a tmux session')
  .argument('<name>', 'Agent name')
  .action(async (name: string) => {
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

      // Start agent
      console.log(`Starting agent "${agent.name}" (${agent.type})...`);
      await lifecycle.startAgent(agent.id);

      // Re-fetch agent to get updated session info
      const updatedAgent = agentManager.getAgent(agent.id);
      if (!updatedAgent) {
        throw new Error('Failed to retrieve updated agent information');
      }

      console.log(`\nAgent started successfully!`);
      console.log(`  Session: ${updatedAgent.sessionName}`);
      console.log(`  Status: ${updatedAgent.status}`);
      console.log(`\nTo view logs: mux agent:logs ${agent.name}`);
      console.log(`To stop: mux agent:stop ${agent.name}`);
      console.log(`To attach: tmux attach -t ${updatedAgent.sessionName}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
