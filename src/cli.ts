#!/usr/bin/env node

/**
 * MindMux CLI - Multi-Agent AI CLI
 * Main entry point for command-line interface
 */

import { Command } from 'commander';
import { createAgentCommand } from './commands/agent/create';
import { listAgentsCommand } from './commands/agent/list';
import { deleteAgentCommand } from './commands/agent/delete';
import { statusAgentCommand } from './commands/agent/status';
import { showConfigCommand } from './commands/config/show';

const program = new Command();

program
  .name('mux')
  .description('MindMux - Multi-Agent AI CLI for orchestrating AI agents')
  .version('0.1.0');

// Register agent commands
program.addCommand(createAgentCommand);
program.addCommand(listAgentsCommand);
program.addCommand(deleteAgentCommand);
program.addCommand(statusAgentCommand);

// Register config commands
program.addCommand(showConfigCommand);

// Parse arguments
program.parse();
