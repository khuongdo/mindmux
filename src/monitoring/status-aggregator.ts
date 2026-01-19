/**
 * Status aggregator for MindMux
 * Provides real-time snapshots of agent and task states
 */

import { Agent, Task } from '../core/types.js';
import { getMetricsCollector, Metrics } from './metrics-collector.js';

export interface AgentStatusSnapshot {
  id: string;
  name: string;
  type: string;
  status: string;
  capabilities: string[];
  isRunning: boolean;
  createdAt: string;
  lastActivity?: string;
}

export interface TaskStatusSnapshot {
  id: string;
  status: string;
  priority: number;
  assignedAgentId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SystemStats {
  uptime_seconds: number;
  timestamp: string;
  version: string;
  metrics: Metrics;
}

export interface StatusSnapshot {
  agents: AgentStatusSnapshot[];
  tasks: TaskStatusSnapshot[];
  systemStats: SystemStats;
}

export class StatusAggregator {
  private version: string;
  private agents: Agent[] = [];
  private tasks: Task[] = [];

  constructor(version: string = '0.1.0') {
    this.version = version;
  }

  setAgents(agents: Agent[]): void {
    this.agents = agents;
  }

  setTasks(tasks: Task[]): void {
    this.tasks = tasks;
  }

  private snapshotAgent(agent: Agent): AgentStatusSnapshot {
    return {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status,
      capabilities: agent.capabilities,
      isRunning: agent.isRunning || false,
      createdAt: agent.createdAt,
      lastActivity: agent.lastActivity,
    };
  }

  private snapshotTask(task: Task): TaskStatusSnapshot {
    return {
      id: task.id,
      status: task.status,
      priority: task.priority,
      assignedAgentId: task.assignedAgentId || task.agentId,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
    };
  }

  filterByAgentStatus(status: string): AgentStatusSnapshot[] {
    return this.agents.filter((a) => a.status === status).map((a) => this.snapshotAgent(a));
  }

  filterByTaskStatus(status: string): TaskStatusSnapshot[] {
    return this.tasks.filter((t) => t.status === status).map((t) => this.snapshotTask(t));
  }

  getSnapshot(): StatusSnapshot {
    const metrics = getMetricsCollector().getMetrics();

    return {
      agents: this.agents.map((a) => this.snapshotAgent(a)),
      tasks: this.tasks.map((t) => this.snapshotTask(t)),
      systemStats: {
        uptime_seconds: metrics.uptime_seconds,
        timestamp: new Date().toISOString(),
        version: this.version,
        metrics,
      },
    };
  }
}

let instance: StatusAggregator | null = null;

export function getStatusAggregator(): StatusAggregator {
  if (!instance) {
    instance = new StatusAggregator();
  }
  return instance;
}

export function resetStatusAggregator(): void {
  instance = null;
}
