/**
 * Agent delete command
 */

import { Command } from 'commander';
import { ConfigManager } from '../../core/config-manager.js';
import { AgentManager } from '../../core/agent-manager.js';
import * as readline from 'readline';

export const deleteAgentCommand = new Command('agent:delete')
  .description('Delete an agent')
  .argument('<identifier>', 'Agent name or ID')
  .option('-y, --yes', 'Skip confirmation prompt', false)
  .action(async (identifier: string, options) => {
    try {
      const configManager = new ConfigManager();
      const agentManager = new AgentManager(configManager);

      // Check if agent exists
      let agent = agentManager.getAgent(identifier);
      if (!agent) {
        agent = agentManager.getAgentByName(identifier);
      }

      if (!agent) {
        console.error(`Error: Agent "${identifier}" not found`);
        process.exit(1);
      }

      // Confirmation prompt
      if (!options.yes) {
        const confirmed = await confirmDelete(agent.name);
        if (!confirmed) {
          console.log('Deletion cancelled');
          process.exit(0);
        }
      }

      // Delete agent
      const success = agentManager.deleteAgent(identifier);

      if (success) {
        console.log(`✓ Agent "${agent.name}" deleted successfully`);
        process.exit(0);
      } else {
        console.error(`Error: Failed to delete agent "${identifier}"`);
        process.exit(1);
      }
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
 * Prompt user for confirmation
 */
function confirmDelete(agentName: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `Are you sure you want to delete agent "${agentName}"? (y/N) `,
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      }
    );
  });
}
