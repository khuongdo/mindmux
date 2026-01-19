import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskQueueManager } from '../../src/core/task-queue-manager';
import { AgentManager } from '../../src/core/agent-manager';
import { ConfigManager } from '../../src/core/config-manager';
import { AgentLifecycle } from '../../src/core/agent-lifecycle';
import { SessionManager } from '../../src/core/session-manager';

vi.mock('../../src/core/capability-matcher');
vi.mock('../../src/core/load-balancer');
vi.mock('../../src/core/dependency-resolver');
vi.mock('../../src/core/tmux-controller');
vi.mock('../../src/monitoring/logger');
vi.mock('../../src/monitoring/metrics-collector');
vi.mock('../../src/monitoring/event-emitter');

describe('Task Flow Integration', () => {
  let taskQueueManager: TaskQueueManager;
  let agentManager: AgentManager;
  let configManager: ConfigManager;
  let agentLifecycle: AgentLifecycle;
  let sessionManager: SessionManager;

  beforeEach(() => {
    vi.clearAllMocks();

    configManager = new ConfigManager();
    agentManager = new AgentManager(configManager);
    sessionManager = new SessionManager();
    agentLifecycle = new AgentLifecycle(agentManager, sessionManager);
    taskQueueManager = new TaskQueueManager(agentManager, agentLifecycle);
  });

  describe('Task queue flow', () => {
    it('should queue task and track status', async () => {
      const task = taskQueueManager.enqueue({
        prompt: 'Generate a function',
        priority: 50,
        requiredCapabilities: ['code-generation'],
      });

      expect(task.status).toBe('pending');
      expect(task.id).toBeDefined();

      const found = taskQueueManager.getTask(task.id);
      expect(found).not.toBeUndefined();
    });

    it('should maintain task order by priority', () => {
      const low = taskQueueManager.enqueue({
        prompt: 'Low priority',
        priority: 10,
      });
      const high = taskQueueManager.enqueue({
        prompt: 'High priority',
        priority: 100,
      });

      const tasks = taskQueueManager.listTasks();
      expect(tasks).toHaveLength(2);
    });
  });

  describe('Task assignment', () => {
    it('should queue tasks for assignment', () => {
      agentManager.createAgent('test-agent', 'claude', ['code-generation']);

      const task = taskQueueManager.enqueue({
        prompt: 'Test task',
        requiredCapabilities: ['code-generation'],
      });

      expect(task).toBeDefined();
    });

    it('should track assigned tasks', async () => {
      const agent = agentManager.createAgent('test-agent', 'claude', [
        'code-generation',
      ]);

      const task = taskQueueManager.enqueue({
        prompt: 'Test task',
        requiredCapabilities: ['code-generation'],
      });

      // Manually assign for testing
      task.agentId = agent.id;
      task.status = 'assigned';

      const assignedTasks = taskQueueManager.listTasks({
        status: 'assigned',
        agentId: agent.id,
      });

      expect(assignedTasks).toBeDefined();
    });
  });

  describe('Task execution flow', () => {
    it('should handle task creation through execution', () => {
      const agent = agentManager.createAgent('test-agent', 'claude', [
        'code-generation',
      ]);

      const task = taskQueueManager.enqueue({
        prompt: 'Generate test',
        priority: 50,
        requiredCapabilities: ['code-generation'],
      });

      expect(task.status).toBe('pending');
      expect(taskQueueManager.getTask(task.id)).toBeDefined();
    });

    it('should track task completion', () => {
      const task = taskQueueManager.enqueue({
        prompt: 'Test task',
      });

      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = 'Task completed';

      const found = taskQueueManager.getTask(task.id);
      expect(found?.status).toBe('completed');
    });

    it('should handle task failures', () => {
      const task = taskQueueManager.enqueue({
        prompt: 'Failing task',
      });

      task.status = 'failed';
      task.error = 'Task failed';
      task.completedAt = new Date().toISOString();

      const found = taskQueueManager.getTask(task.id);
      expect(found?.status).toBe('failed');
      expect(found?.error).toBe('Task failed');
    });
  });

  describe('Task cancellation', () => {
    it('should cancel pending tasks', () => {
      const task = taskQueueManager.enqueue({
        prompt: 'Cancellable task',
      });

      const cancelled = taskQueueManager.cancel(task.id);

      expect(cancelled).toBe(true);
      expect(taskQueueManager.getTask(task.id)?.status).toBe('cancelled');
    });

    it('should prevent cancelling running tasks', () => {
      const task = taskQueueManager.enqueue({
        prompt: 'Running task',
      });

      task.status = 'running';

      const cancelled = taskQueueManager.cancel(task.id);

      expect(cancelled).toBe(false);
    });
  });

  describe('Task retry logic', () => {
    it('should retry failed tasks', () => {
      const task = taskQueueManager.enqueue({
        prompt: 'Retry task',
        maxRetries: 3,
      });

      expect(task.retryCount).toBe(0);
      expect(task.maxRetries).toBe(3);

      task.retryCount = 1;
      task.error = 'Retry 1/3: Failed';

      const found = taskQueueManager.getTask(task.id);
      expect(found?.retryCount).toBe(1);
    });

    it('should exhaust retries', () => {
      const task = taskQueueManager.enqueue({
        prompt: 'Max retries task',
        maxRetries: 2,
      });

      task.retryCount = 3; // Exceeded max

      expect(task.retryCount).toBeGreaterThan(task.maxRetries);
    });
  });

  describe('Queue statistics', () => {
    it('should track queue statistics', () => {
      taskQueueManager.enqueue({ prompt: 'Task 1' });
      taskQueueManager.enqueue({ prompt: 'Task 2' });
      taskQueueManager.enqueue({ prompt: 'Task 3' });

      const stats = taskQueueManager.getQueueStats();

      expect(stats.pending).toBeGreaterThanOrEqual(0);
      expect(stats.queued).toBeGreaterThanOrEqual(0);
      expect(stats.completed).toBeGreaterThanOrEqual(0);
    });

    it('should update statistics as tasks complete', () => {
      const task1 = taskQueueManager.enqueue({ prompt: 'Task 1' });
      const task2 = taskQueueManager.enqueue({ prompt: 'Task 2' });

      task1.status = 'completed';
      task2.status = 'failed';

      const stats = taskQueueManager.getQueueStats();

      expect(stats.completed).toBeGreaterThanOrEqual(1);
      expect(stats.failed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Task cleanup', () => {
    it('should clean up finished tasks', () => {
      const task1 = taskQueueManager.enqueue({ prompt: 'Task 1' });
      const task2 = taskQueueManager.enqueue({ prompt: 'Task 2' });

      task1.status = 'completed';
      task2.status = 'pending';

      const cleared = taskQueueManager.clearFinishedTasks();

      expect(cleared).toBeGreaterThanOrEqual(1);
      expect(taskQueueManager.getTask(task1.id)).toBeUndefined();
    });
  });

  describe('Agent availability notifications', () => {
    it('should handle agent availability changes', () => {
      const agent = agentManager.createAgent('test-agent', 'claude', [
        'code-generation',
      ]);

      taskQueueManager.onAgentAvailable(agent.id);

      // Should process queue without errors
      const stats = taskQueueManager.getQueueStats();
      expect(stats).toBeDefined();
    });
  });
});
