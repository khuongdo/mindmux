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
import {
  initializePersistence,
  shutdownPersistence,
  PersistenceServices,
} from './persistence/persistence-manager.js';

// Singleton instances
let taskQueueManager: TaskQueueManager | null = null;
let persistenceServices: PersistenceServices | null = null;

function getTaskQueueManager(): TaskQueueManager {
  if (!taskQueueManager) {
    const configManager = new ConfigManager();
    const agentManager = new AgentManager(configManager);
    const tmuxController = new TmuxController();
    const agentLifecycle = new AgentLifecycle(tmuxController, agentManager);

    // Attach SQLite repository if available
    if (persistenceServices) {
      agentManager.setRepository(persistenceServices.agentRepository);
    }

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

/**
 * Initialize persistence layer on startup
 */
async function initializePersistenceLayer() {
  try {
    persistenceServices = initializePersistence();
  } catch (error) {
    console.warn(
      'Persistence initialization failed, continuing with JSON fallback:',
      error instanceof Error ? error.message : String(error)
    );
    // Continue without persistence - JSON fallback will be used
  }
}

/**
 * Perform startup recovery
 */
async function performStartupRecovery() {
  try {
    if (!persistenceServices) {
      return;
    }

    // Recover incomplete tasks
    const incompleteTasks = persistenceServices.taskRepository.getIncomplete();
    if (incompleteTasks.length > 0) {
      console.log(`Found ${incompleteTasks.length} incomplete task(s) from previous session`);
      // Tasks remain in queue for reprocessing
    }

    // Find and cleanup orphaned sessions
    const orphanedSessions = persistenceServices.sessionRepository.findOrphaned();
    if (orphanedSessions.length > 0) {
      console.log(`Found ${orphanedSessions.length} orphaned session(s)`);
      // Sessions will be terminated on next health check
    }
  } catch (error) {
    console.warn('Startup recovery failed:', error instanceof Error ? error.message : String(error));
  }
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

/**
 * Run all startup routines
 */
async function runStartupRoutines() {
  // Initialize persistence first
  await initializePersistenceLayer();

  // Perform recovery
  await performStartupRecovery();

  // Initialize session recovery
  await initializeSessionRecovery();
}

/**
 * Graceful shutdown
 */
process.on('exit', () => {
  if (persistenceServices) {
    shutdownPersistence(persistenceServices);
  }
});

process.on('SIGINT', () => {
  if (persistenceServices) {
    shutdownPersistence(persistenceServices);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (persistenceServices) {
    shutdownPersistence(persistenceServices);
  }
  process.exit(0);
});

const program = new Command();

program
  .name('mux')
  .description('MindMux - Multi-Agent AI CLI for orchestrating AI agents')
  .version('0.1.0')
  .hook('preAction', async () => {
    // Run all startup routines before first command
    await runStartupRoutines();
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
