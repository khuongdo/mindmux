/**
 * Task Queue Manager
 * Central orchestration for task queuing, assignment, and execution
 */

import { randomUUID } from 'crypto';
import { Task, TaskStatus, CreateTaskOptions, Agent } from './types.js';
import { AgentManager } from './agent-manager.js';
import { CapabilityMatcher } from './capability-matcher.js';
import { LoadBalancer, LoadBalancingStrategy } from './load-balancer.js';
import { DependencyResolver } from './dependency-resolver.js';
import { AgentLifecycle } from './agent-lifecycle.js';
import { getMetricsCollector } from '../monitoring/metrics-collector.js';
import { getEventEmitter } from '../monitoring/event-emitter.js';
import { createLogger } from '../monitoring/logger.js';

export interface TaskQueueConfig {
  defaultPriority: number;
  defaultMaxRetries: number;
  defaultTimeout: number;
  loadBalancingStrategy: LoadBalancingStrategy;
}

const DEFAULT_CONFIG: TaskQueueConfig = {
  defaultPriority: 50,
  defaultMaxRetries: 3,
  defaultTimeout: 300000, // 5 minutes
  loadBalancingStrategy: 'round-robin',
};

export class TaskQueueManager {
  private tasks: Map<string, Task> = new Map();
  private queue: string[] = [];  // Task IDs sorted by priority
  private runningTasks: Map<string, string[]> = new Map(); // agentId -> taskIds

  private capabilityMatcher: CapabilityMatcher;
  private loadBalancer: LoadBalancer;
  private dependencyResolver: DependencyResolver;
  private isProcessing: boolean = false;
  private logger = createLogger('TaskQueueManager');

  constructor(
    private agentManager: AgentManager,
    private agentLifecycle: AgentLifecycle,
    private config: TaskQueueConfig = DEFAULT_CONFIG
  ) {
    this.capabilityMatcher = new CapabilityMatcher(agentManager);
    this.loadBalancer = new LoadBalancer(config.loadBalancingStrategy);
    this.dependencyResolver = new DependencyResolver();
  }

  /**
   * Create and enqueue a new task
   */
  enqueue(options: CreateTaskOptions): Task {
    const task: Task = {
      id: randomUUID(),
      prompt: options.prompt,
      status: 'pending',
      priority: options.priority ?? this.config.defaultPriority,
      requiredCapabilities: options.requiredCapabilities || [],
      dependsOn: options.dependsOn,
      createdAt: new Date().toISOString(),
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: options.maxRetries ?? this.config.defaultMaxRetries,
      timeout: options.timeout ?? this.config.defaultTimeout,
    };

    this.tasks.set(task.id, task);

    // Emit metrics
    getMetricsCollector().incrementCounter('tasks_queued');

    // Emit event
    getEventEmitter().emitTaskQueued(task.id, task.priority, task.requiredCapabilities);

    // Check dependencies
    if (this.dependencyResolver.canExecute(task, this.tasks)) {
      this.addToQueue(task);
    }

    this.logger.info('task_enqueued', {
      taskId: task.id,
      priority: task.priority,
      capabilities: task.requiredCapabilities,
    });

    // Trigger queue processing
    this.processQueue();

    return task;
  }

  /**
   * Add task to priority queue
   */
  private addToQueue(task: Task): void {
    task.status = 'queued';
    task.queuedAt = new Date().toISOString();

    // Insert in priority order (higher priority first)
    const insertIndex = this.queue.findIndex(id => {
      const t = this.tasks.get(id);
      return t && t.priority < task.priority;
    });

    if (insertIndex === -1) {
      this.queue.push(task.id);
    } else {
      this.queue.splice(insertIndex, 0, task.id);
    }
  }

  /**
   * Process queue and assign tasks to available agents
   */
  async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Process pending tasks (check dependencies)
      for (const [id, task] of this.tasks) {
        if (task.status === 'pending') {
          // Check if dependency failed
          if (this.dependencyResolver.hasDependencyFailed(task, this.tasks)) {
            task.status = 'failed';
            task.error = 'Dependency task failed';
            task.completedAt = new Date().toISOString();
            continue;
          }

          // Check if dependencies satisfied
          if (this.dependencyResolver.canExecute(task, this.tasks)) {
            this.addToQueue(task);
          }
        }
      }

      // Process queued tasks
      const tasksToProcess = [...this.queue];

      for (const taskId of tasksToProcess) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'queued') continue;

        // Find capable agents
        const capableAgents = this.capabilityMatcher.findCapableAgents(task);
        if (capableAgents.length === 0) {
          // No capable agents, keep in queue silently
          continue;
        }

        // Find available agents
        const availableAgents = this.capabilityMatcher.findAvailableAgents(
          capableAgents,
          this.runningTasks
        );

        if (availableAgents.length === 0) {
          // No available agents, keep in queue silently
          continue;
        }

        // Select agent using load balancer
        const selectedAgent = this.loadBalancer.selectAgent(
          availableAgents,
          this.runningTasks
        );

        if (selectedAgent) {
          await this.assignAndExecute(task, selectedAgent);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Assign task to agent and execute
   */
  private async assignAndExecute(task: Task, agent: Agent): Promise<void> {
    // Remove from queue
    this.queue = this.queue.filter(id => id !== task.id);

    // Update task status
    task.status = 'assigned';
    task.agentId = agent.id;
    task.assignedAt = new Date().toISOString();

    // Track running task
    const agentTasks = this.runningTasks.get(agent.id) || [];
    agentTasks.push(task.id);
    this.runningTasks.set(agent.id, agentTasks);

    // Execute asynchronously
    this.executeTask(task, agent);
  }

  /**
   * Execute task on agent
   */
  private async executeTask(task: Task, agent: Agent): Promise<void> {
    try {
      task.status = 'running';
      task.startedAt = new Date().toISOString();

      // Execute via AgentLifecycle
      const result = await this.agentLifecycle.executeTask(agent.id, task.prompt);

      // Success
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = result.result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if should retry
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = 'queued';
        task.error = `Retry ${task.retryCount}/${task.maxRetries}: ${errorMessage}`;
        this.addToQueue(task);
      } else {
        // Max retries exhausted
        task.status = 'failed';
        task.completedAt = new Date().toISOString();
        task.error = errorMessage;
      }
    } finally {
      // Remove from running tasks
      const agentTasks = this.runningTasks.get(task.agentId!) || [];
      this.runningTasks.set(
        task.agentId!,
        agentTasks.filter(id => id !== task.id)
      );

      // Process queue for next task
      this.processQueue();
    }
  }

  /**
   * Cancel a pending or queued task
   */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'pending' || task.status === 'queued') {
      task.status = 'cancelled';
      task.completedAt = new Date().toISOString();
      this.queue = this.queue.filter(id => id !== taskId);
      return true;
    }

    return false; // Cannot cancel running/completed/failed tasks
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * List all tasks with optional filter
   */
  listTasks(filter?: { status?: TaskStatus; agentId?: string }): Task[] {
    let tasks = Array.from(this.tasks.values());

    if (filter?.status) {
      tasks = tasks.filter(t => t.status === filter.status);
    }

    if (filter?.agentId) {
      tasks = tasks.filter(t => t.agentId === filter.agentId);
    }

    // Sort by creation time (newest first)
    return tasks.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    pending: number;
    queued: number;
    assigned: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const stats = {
      pending: 0,
      queued: 0,
      assigned: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const task of this.tasks.values()) {
      stats[task.status]++;
    }

    return stats;
  }

  /**
   * Clear completed/failed/cancelled tasks from memory
   */
  clearFinishedTasks(): number {
    let cleared = 0;
    for (const [id, task] of this.tasks) {
      if (['completed', 'failed', 'cancelled'].includes(task.status)) {
        this.tasks.delete(id);
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * Notify that an agent became available
   * Triggers queue processing
   */
  onAgentAvailable(agentId: string): void {
    this.processQueue();
  }
}
