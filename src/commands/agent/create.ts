/**
 * Agent create command
 */

import { Command } from 'commander';
import { ConfigManager } from '../../core/config-manager';
import { AgentManager } from '../../core/agent-manager';
import { AgentType } from '../../core/types';
import {
  validateAgentName,
  validateAgentType,
  validateCapabilities,
  getAgentNameError,
  getAgentTypeError,
  getCapabilitiesError,
} from '../../utils/validators';

export const createAgentCommand = new Command('agent:create')
  .description('Create a new agent')
  .argument('<name>', 'Agent name (3-64 chars, alphanumeric, hyphens, underscores)')
  .option('-t, --type <type>', 'Agent type (claude, gemini, gpt4, opencode)', 'claude')
  .option('-c, --capabilities <caps>', 'Comma-separated capabilities', 'code-generation')
  .option('-m, --model <model>', 'Override default model for this agent type')
  .option('--max-tasks <number>', 'Max concurrent tasks', '1')
  .option('--timeout <ms>', 'Task timeout in milliseconds')
  .action((name: string, options) => {
    try {
      // Validate agent name
      if (!validateAgentName(name)) {
        const error = getAgentNameError(name);
        console.error(`Error: ${error}`);
        process.exit(1);
      }

      // Validate agent type
      const type = options.type as string;
      if (!validateAgentType(type)) {
        const error = getAgentTypeError(type);
        console.error(`Error: ${error}`);
        process.exit(1);
      }

      // Parse and validate capabilities
      const capabilities = options.capabilities
        .split(',')
        .map((cap: string) => cap.trim())
        .filter((cap: string) => cap.length > 0);

      if (!validateCapabilities(capabilities)) {
        const error = getCapabilitiesError(capabilities);
        console.error(`Error: ${error}`);
        process.exit(1);
      }

      // Create managers
      const configManager = new ConfigManager();
      const agentManager = new AgentManager(configManager);

      // Create agent
      const agent = agentManager.createAgent(
        name,
        type as AgentType,
        capabilities,
        {
          model: options.model,
          maxConcurrentTasks: parseInt(options.maxTasks, 10),
          timeout: options.timeout ? parseInt(options.timeout, 10) : undefined,
        }
      );

      console.log(`✓ Agent created successfully`);
      console.log(`  ID: ${agent.id}`);
      console.log(`  Name: ${agent.name}`);
      console.log(`  Type: ${agent.type}`);
      console.log(`  Model: ${agent.config.model}`);
      console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
      console.log(`  Status: ${agent.status}`);

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
