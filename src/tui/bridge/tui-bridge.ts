/**
 * Bridge between TUI components and core managers
 * Singleton that provides access to all managers
 */

import { AgentManager } from '../../core/agent-manager';
import { TaskQueueManager } from '../../core/task-queue-manager';
import { AgentLifecycle } from '../../core/agent-lifecycle';
import { TmuxController } from '../../core/tmux-controller';
import { ConfigManager } from '../../core/config-manager';
import { Agent, Task, TaskStatus, CreateTaskOptions, AgentType } from '../../core/types';

export interface QueueStats {
  pending: number;
  queued: number;
  assigned: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface AgentWithSession extends Agent {
  hasActiveSession: boolean;
}

export class TuiBridge {
  private configManager: ConfigManager;
  private agentManager: AgentManager;
  private tmuxController: TmuxController;
  private agentLifecycle: AgentLifecycle;
  private taskQueueManager: TaskQueueManager;
  private initialized: boolean = false;

  constructor() {
    this.configManager = new ConfigManager();
    this.agentManager = new AgentManager(this.configManager);
    this.tmuxController = new TmuxController();
    this.agentLifecycle = new AgentLifecycle(this.tmuxController, this.agentManager);
    this.taskQueueManager = new TaskQueueManager(
      this.agentManager,
      this.agentLifecycle,
      {
        defaultPriority: 50,
        defaultMaxRetries: 3,
        defaultTimeout: this.configManager.getConfig().timeout,
        loadBalancingStrategy: 'round-robin',
      }
    );
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.tmuxController.initialize();
    this.initialized = true;
  }

  // Agent operations
  async listAgents(): Promise<AgentWithSession[]> {
    const agents = this.agentManager.listAgents();
    const results: AgentWithSession[] = [];

    for (const agent of agents) {
      const hasActiveSession = agent.sessionName
        ? await this.tmuxController.hasSession(agent.sessionName)
        : false;

      results.push({ ...agent, hasActiveSession });
    }

    return results;
  }

  getAgent(id: string): Agent | null {
    return this.agentManager.getAgent(id);
  }

  getAgentByName(name: string): Agent | null {
    return this.agentManager.getAgentByName(name);
  }

  createAgent(
    name: string,
    type: AgentType,
    capabilities: string[]
  ): Agent {
    return this.agentManager.createAgent(name, type, capabilities);
  }

  deleteAgent(identifier: string): boolean {
    return this.agentManager.deleteAgent(identifier);
  }

  async startAgent(agentId: string): Promise<void> {
    await this.agentLifecycle.startAgent(agentId);
  }

  async stopAgent(agentId: string): Promise<void> {
    await this.agentLifecycle.stopAgent(agentId);
  }

  async getAgentLogs(agentId: string, lines: number = 100): Promise<string> {
    return await this.agentLifecycle.getAgentLogs(agentId, lines);
  }

  // Task operations
  listTasks(filter?: { status?: TaskStatus; agentId?: string }): Task[] {
    return this.taskQueueManager.listTasks(filter);
  }

  getTask(taskId: string): Task | undefined {
    return this.taskQueueManager.getTask(taskId);
  }

  enqueueTask(options: CreateTaskOptions): Task {
    return this.taskQueueManager.enqueue(options);
  }

  cancelTask(taskId: string): boolean {
    return this.taskQueueManager.cancel(taskId);
  }

  getQueueStats(): QueueStats {
    return this.taskQueueManager.getQueueStats();
  }

  // Session operations
  async attachToSession(agentId: string): Promise<void> {
    const agent = this.agentManager.getAgent(agentId);
    if (!agent || !agent.sessionName) {
      throw new Error('Agent has no active session');
    }

    // Use execSync to attach (this will take over the terminal)
    const { execSync } = await import('child_process');
    execSync(`tmux attach -t "${agent.sessionName}"`, {
      stdio: 'inherit',
    });
  }

  async listSessions(): Promise<string[]> {
    return await this.tmuxController.listSessions();
  }

  // Utility
  getRunningAgentCount(): number {
    const agents = this.agentManager.listAgents();
    return agents.filter(a => a.isRunning).length;
  }
}

// Singleton instance
let tuiBridgeInstance: TuiBridge | null = null;

export function getTuiBridge(): TuiBridge {
  if (!tuiBridgeInstance) {
    tuiBridgeInstance = new TuiBridge();
  }
  return tuiBridgeInstance;
}
