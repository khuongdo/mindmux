/**
 * Agent status command
 */

import { Command } from 'commander';
import { ConfigManager } from '../../core/config-manager';
import { AgentManager } from '../../core/agent-manager';

export const statusAgentCommand = new Command('agent:status')
  .description('Show detailed agent status')
  .argument('<identifier>', 'Agent name or ID')
  .action((identifier: string) => {
    try {
      const configManager = new ConfigManager();
      const agentManager = new AgentManager(configManager);

      // Find agent by ID or name
      let agent = agentManager.getAgent(identifier);
      if (!agent) {
        agent = agentManager.getAgentByName(identifier);
      }

      if (!agent) {
        console.error(`Error: Agent "${identifier}" not found`);
        process.exit(1);
      }

      // Display detailed status
      console.log('');
      console.log('AGENT STATUS');
      console.log('═'.repeat(60));
      console.log('');
      console.log(`Name:              ${agent.name}`);
      console.log(`ID:                ${agent.id}`);
      console.log(`Type:              ${agent.type}`);
      console.log(`Status:            ${getStatusIcon(agent.status)} ${agent.status.toUpperCase()}`);
      console.log('');
      console.log('Configuration:');
      console.log(`  Model:           ${agent.config.model}`);
      console.log(`  Max Tasks:       ${agent.config.maxConcurrentTasks}`);
      console.log(`  Timeout:         ${formatTimeout(agent.config.timeout || 0)}`);
      console.log('');
      console.log('Capabilities:');
      agent.capabilities.forEach(cap => {
        console.log(`  • ${cap}`);
      });
      console.log('');
      console.log('Timeline:');
      console.log(`  Created:         ${new Date(agent.createdAt).toLocaleString()}`);
      if (agent.lastActivity) {
        console.log(`  Last Activity:   ${new Date(agent.lastActivity).toLocaleString()}`);
        console.log(`  Idle Duration:   ${getIdleDuration(agent.lastActivity)}`);
      } else {
        console.log(`  Last Activity:   Never`);
      }
      console.log('');
      console.log('═'.repeat(60));
      console.log('');

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
 * Get status icon
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'idle':
      return '●';
    case 'busy':
      return '◆';
    case 'unhealthy':
      return '✖';
    default:
      return '○';
  }
}

/**
 * Format timeout duration
 */
function formatTimeout(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Get idle duration since last activity
 */
function getIdleDuration(lastActivity: string): string {
  const now = Date.now();
  const last = new Date(lastActivity).getTime();
  const diff = now - last;

  return formatTimeout(diff);
}
