#!/usr/bin/env node

/**
 * MindMux CLI - Multi-Agent AI CLI
 * Main entry point for command-line interface
 */

import 'dotenv/config';
import { Command } from 'commander';
import { createAgentCommand } from './commands/agent/create';
import { listAgentsCommand } from './commands/agent/list';
import { deleteAgentCommand } from './commands/agent/delete';
import { statusAgentCommand } from './commands/agent/status';
import { startAgentCommand } from './commands/agent/start';
import { stopAgentCommand } from './commands/agent/stop';
import { logsAgentCommand } from './commands/agent/logs';
import { showConfigCommand } from './commands/config/show';
import { assignTaskCommand } from './commands/task/assign';
import { createTaskListCommand } from './commands/task/list';
import { createTaskStatusCommand } from './commands/task/status';
import { createTaskCancelCommand } from './commands/task/cancel';
import { createTaskQueueCommand } from './commands/task/queue';
import { tuiCommand } from './commands/tui';
import { ConfigManager } from './core/config-manager';
import { AgentManager } from './core/agent-manager';
import { TmuxController } from './core/tmux-controller';
import { AgentLifecycle } from './core/agent-lifecycle';
import { SessionManager } from './core/session-manager';
import { TaskQueueManager } from './core/task-queue-manager';
import { isTmuxAvailable } from './utils/tmux-check';

// Singleton instances
let taskQueueManager: TaskQueueManager | null = null;

function getTaskQueueManager(): TaskQueueManager {
  if (!taskQueueManager) {
    const configManager = new ConfigManager();
    const agentManager = new AgentManager(configManager);
    const tmuxController = new TmuxController();
    const agentLifecycle = new AgentLifecycle(tmuxController, agentManager);

    taskQueueManager = new TaskQueueManager(
      agentManager,
      agentLifecycle,
      {
        defaultPriority: 50,
        defaultMaxRetries: 3,
        defaultTimeout: configManager.getConfig().timeout,
        loadBalancingStrategy: 'round-robin',
      }
    );
  }
  return taskQueueManager;
}

// Initialize session recovery on startup
async function initializeSessionRecovery() {
  // Only run if tmux is available (don't block if not)
  if (!isTmuxAvailable()) {
    return;
  }

  try {
    const configManager = new ConfigManager();
    const agentManager = new AgentManager(configManager);
    const tmuxController = new TmuxController();
    const lifecycle = new AgentLifecycle(tmuxController, agentManager);
    const sessionManager = new SessionManager(lifecycle);

    await tmuxController.initialize();
    await sessionManager.initializeOnStartup();
  } catch (error) {
    // Silently fail - don't block CLI startup
    // Error will be shown when user tries to use tmux commands
  }
}

const program = new Command();

program
  .name('mux')
  .description('MindMux - Multi-Agent AI CLI for orchestrating AI agents')
  .version('0.1.0')
  .hook('preAction', async () => {
    // Run session recovery before first command
    await initializeSessionRecovery();
  });

// Register agent commands
program.addCommand(createAgentCommand);
program.addCommand(listAgentsCommand);
program.addCommand(deleteAgentCommand);
program.addCommand(statusAgentCommand);
program.addCommand(startAgentCommand);
program.addCommand(stopAgentCommand);
program.addCommand(logsAgentCommand);

// Register task commands
program.addCommand(assignTaskCommand);
program.addCommand(createTaskListCommand(getTaskQueueManager));
program.addCommand(createTaskStatusCommand(getTaskQueueManager));
program.addCommand(createTaskCancelCommand(getTaskQueueManager));
program.addCommand(createTaskQueueCommand(getTaskQueueManager));

// Register config commands
program.addCommand(showConfigCommand);

// Register TUI command
program.addCommand(tuiCommand);

// Parse arguments
program.parse();
