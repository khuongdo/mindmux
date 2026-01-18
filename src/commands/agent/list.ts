/**
 * Agent list command
 */

import { Command } from 'commander';
import { ConfigManager } from '../../core/config-manager.js';
import { AgentManager } from '../../core/agent-manager.js';

export const listAgentsCommand = new Command('agent:list')
  .description('List all agents')
  .option('-v, --verbose', 'Show detailed information', false)
  .action((options) => {
    try {
      const configManager = new ConfigManager();
      const agentManager = new AgentManager(configManager);

      const agents = agentManager.listAgents();

      if (agents.length === 0) {
        console.log('No agents found. Create one with: mux agent:create <name>');
        process.exit(0);
      }

      if (options.verbose) {
        // Detailed view
        agents.forEach((agent, index) => {
          if (index > 0) console.log('');
          console.log(`Agent: ${agent.name}`);
          console.log(`  ID: ${agent.id}`);
          console.log(`  Type: ${agent.type}`);
          console.log(`  Model: ${agent.config.model}`);
          console.log(`  Status: ${agent.status}`);
          console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
          console.log(`  Created: ${new Date(agent.createdAt).toLocaleString()}`);
          if (agent.lastActivity) {
            console.log(`  Last Activity: ${new Date(agent.lastActivity).toLocaleString()}`);
          }
          console.log(`  Max Tasks: ${agent.config.maxConcurrentTasks}`);
          console.log(`  Timeout: ${agent.config.timeout}ms`);
        });
      } else {
        // Table view
        console.log('');
        console.log('AGENTS');
        console.log('─'.repeat(100));
        console.log(
          `${'NAME'.padEnd(20)} ${'TYPE'.padEnd(12)} ${'STATUS'.padEnd(12)} ${'CAPABILITIES'.padEnd(40)} ${'ID'.padEnd(12)}`
        );
        console.log('─'.repeat(100));

        agents.forEach(agent => {
          const capabilities = agent.capabilities.join(', ');
          const capsDisplay = capabilities.length > 38
            ? capabilities.substring(0, 35) + '...'
            : capabilities;

          const idShort = agent.id.substring(0, 8);

          console.log(
            `${agent.name.padEnd(20)} ${agent.type.padEnd(12)} ${agent.status.padEnd(12)} ${capsDisplay.padEnd(40)} ${idShort.padEnd(12)}`
          );
        });

        console.log('─'.repeat(100));
        console.log(`Total: ${agents.length} agent${agents.length === 1 ? '' : 's'}`);
        console.log('');
        console.log('Use --verbose flag for detailed information');
      }

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
