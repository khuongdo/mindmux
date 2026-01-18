#!/usr/bin/env node

/**
 * MindMux CLI - Multi-Agent AI CLI
 * Main entry point for command-line interface
 */

import 'dotenv/config';
import { Command } from 'commander';
import { createAgentCommand } from './commands/agent/create.js';
import { listAgentsCommand } from './commands/agent/list.js';
import { deleteAgentCommand } from './commands/agent/delete.js';
import { statusAgentCommand } from './commands/agent/status.js';
import { startAgentCommand } from './commands/agent/start.js';
import { stopAgentCommand } from './commands/agent/stop.js';
import { logsAgentCommand } from './commands/agent/logs.js';
import { showConfigCommand } from './commands/config/show.js';
import { assignTaskCommand } from './commands/task/assign.js';
import { createTaskListCommand } from './commands/task/list.js';
import { createTaskStatusCommand } from './commands/task/status.js';
import { createTaskCancelCommand } from './commands/task/cancel.js';
import { createTaskQueueCommand } from './commands/task/queue.js';
import { tuiCommand } from './commands/tui.js';
import { ConfigManager } from './core/config-manager.js';
import { AgentManager } from './core/agent-manager.js';
import { TmuxController } from './core/tmux-controller.js';
import { AgentLifecycle } from './core/agent-lifecycle.js';
import { SessionManager } from './core/session-manager.js';
import { TaskQueueManager } from './core/task-queue-manager.js';
import { isTmuxAvailable } from './utils/tmux-check.js';

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
