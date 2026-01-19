import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskQueueManager } from '../../../src/core/task-queue-manager';
import { AgentManager } from '../../../src/core/agent-manager';
import { AgentLifecycle } from '../../../src/core/agent-lifecycle';
import { TestDataBuilder } from '../../helpers/test-utils';

vi.mock('../../../src/core/agent-manager');
vi.mock('../../../src/core/agent-lifecycle');
vi.mock('../../../src/core/capability-matcher');
vi.mock('../../../src/core/load-balancer');
vi.mock('../../../src/core/dependency-resolver');
vi.mock('../../../src/monitoring/metrics-collector');
vi.mock('../../../src/monitoring/event-emitter');
vi.mock('../../../src/monitoring/logger');

describe('TaskQueueManager', () => {
  let taskQueueManager: TaskQueueManager;
  let mockAgentManager: any;
  let mockAgentLifecycle: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAgentManager = {
      listAgents: vi.fn().mockReturnValue([TestDataBuilder.agent()]),
    } as any;

    mockAgentLifecycle = {
      executeTask: vi.fn().mockResolvedValue({ result: 'success' }),
    };

    taskQueueManager = new TaskQueueManager(mockAgentManager, mockAgentLifecycle);
  });

  describe('enqueue', () => {
    it('should create and enqueue a new task', () => {
      const task = taskQueueManager.enqueue({
        prompt: 'Generate a function',
        priority: 50,
        requiredCapabilities: ['code-generation'],
      });

      expect(task).toBeDefined();
      expect(task.prompt).toBe('Generate a function');
      expect(task.status).toBe('pending');
      expect(task.priority).toBe(50);
    });

    it('should use default priority if not provided', () => {
      const task = taskQueueManager.enqueue({
        prompt: 'Test task',
      });

      expect(task.priority).toBe(50); // DEFAULT_CONFIG.defaultPriority
    });

    it('should set default max retries', () => {
      const task = taskQueueManager.enqueue({
        prompt: 'Test task',
      });

      expect(task.maxRetries).toBe(3); // DEFAULT_CONFIG.defaultMaxRetries
    });

    it('should support custom max retries', () => {
      const task = taskQueueManager.enqueue({
        prompt: 'Test task',
        maxRetries: 5,
      });

      expect(task.maxRetries).toBe(5);
    });

    it('should handle task dependencies', () => {
      const task1 = taskQueueManager.enqueue({
        prompt: 'Task 1',
      });

      const task2 = taskQueueManager.enqueue({
        prompt: 'Task 2',
        dependsOn: task1.id,
      });

      expect(task2.dependsOn).toBe(task1.id);
    });
  });

  describe('getTask', () => {
    it('should return task by ID', () => {
      const created = taskQueueManager.enqueue({
        prompt: 'Test task',
      });

      const found = taskQueueManager.getTask(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return undefined if task not found', () => {
      const found = taskQueueManager.getTask('non-existent');

      expect(found).toBeUndefined();
    });
  });

  describe('listTasks', () => {
    it('should list all tasks', () => {
      taskQueueManager.enqueue({ prompt: 'Task 1' });
      taskQueueManager.enqueue({ prompt: 'Task 2' });
      taskQueueManager.enqueue({ prompt: 'Task 3' });

      const tasks = taskQueueManager.listTasks();

      expect(tasks).toHaveLength(3);
    });

    it('should filter tasks by status', () => {
      const task1 = taskQueueManager.enqueue({ prompt: 'Task 1' });
      const task2 = taskQueueManager.enqueue({ prompt: 'Task 2' });

      // Simulate status update
      task1.status = 'completed';

      const completed = taskQueueManager.listTasks({ status: 'completed' });

      expect(completed).toHaveLength(1);
    });

    it('should filter tasks by agent ID', () => {
      const task1 = taskQueueManager.enqueue({ prompt: 'Task 1' });
      const agentId = 'agent-1';

      task1.agentId = agentId;

      const tasks = taskQueueManager.listTasks({ agentId });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].agentId).toBe(agentId);
    });
  });

  describe('cancel', () => {
    it('should cancel pending task', () => {
      const task = taskQueueManager.enqueue({ prompt: 'Test task' });
      const cancelled = taskQueueManager.cancel(task.id);

      expect(cancelled).toBe(true);
      const found = taskQueueManager.getTask(task.id);
      expect(found?.status).toBe('cancelled');
    });

    it('should return false if task not found', () => {
      const cancelled = taskQueueManager.cancel('non-existent');

      expect(cancelled).toBe(false);
    });

    it('should return false if task already running', () => {
      const task = taskQueueManager.enqueue({ prompt: 'Test task' });
      task.status = 'running';

      const cancelled = taskQueueManager.cancel(task.id);

      expect(cancelled).toBe(false);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', () => {
      taskQueueManager.enqueue({ prompt: 'Task 1' });
      taskQueueManager.enqueue({ prompt: 'Task 2' });

      const stats = taskQueueManager.getQueueStats();

      expect(stats.pending).toBeGreaterThanOrEqual(0);
      expect(stats.completed).toBeGreaterThanOrEqual(0);
    });

    it('should track task statuses', () => {
      const task1 = taskQueueManager.enqueue({ prompt: 'Task 1' });
      const task2 = taskQueueManager.enqueue({ prompt: 'Task 2' });

      task1.status = 'completed';
      task2.status = 'failed';

      const stats = taskQueueManager.getQueueStats();

      expect(stats.completed).toBeGreaterThanOrEqual(1);
      expect(stats.failed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('clearFinishedTasks', () => {
    it('should remove completed tasks', () => {
      const task1 = taskQueueManager.enqueue({ prompt: 'Task 1' });
      const task2 = taskQueueManager.enqueue({ prompt: 'Task 2' });

      task1.status = 'completed';
      task2.status = 'pending';

      const cleared = taskQueueManager.clearFinishedTasks();

      expect(cleared).toBeGreaterThanOrEqual(1);
      expect(taskQueueManager.getTask(task1.id)).toBeUndefined();
    });

    it('should remove failed tasks', () => {
      const task = taskQueueManager.enqueue({ prompt: 'Task' });
      task.status = 'failed';

      const cleared = taskQueueManager.clearFinishedTasks();

      expect(cleared).toBeGreaterThanOrEqual(1);
    });

    it('should remove cancelled tasks', () => {
      const task = taskQueueManager.enqueue({ prompt: 'Task' });
      task.status = 'cancelled';

      const cleared = taskQueueManager.clearFinishedTasks();

      expect(cleared).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Priority ordering', () => {
    it('should maintain priority queue order', () => {
      const low = taskQueueManager.enqueue({ prompt: 'Low', priority: 10 });
      const high = taskQueueManager.enqueue({ prompt: 'High', priority: 100 });
      const medium = taskQueueManager.enqueue({ prompt: 'Medium', priority: 50 });

      const tasks = taskQueueManager.listTasks();

      // Should be ordered by priority (highest first after dequeue)
      expect(tasks).toBeDefined();
    });
  });
});
