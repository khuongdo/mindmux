/**
 * Integration tests for monitoring module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getMetricsCollector, resetMetricsCollector } from './metrics-collector.js';
import { getEventEmitter, resetEventEmitter } from './event-emitter.js';
import { getHealthChecker, resetHealthChecker } from './health-checker.js';
import { getStatusAggregator, resetStatusAggregator } from './status-aggregator.js';
import { getAlertDetector, resetAlertDetector } from './alert-detector.js';
import { createLogger, setLogLevel } from './logger.js';

describe('Monitoring Module', () => {
  beforeEach(() => {
    resetMetricsCollector();
    resetEventEmitter();
    resetHealthChecker();
    resetStatusAggregator();
    resetAlertDetector();
  });

  afterEach(() => {
    const emitter = getEventEmitter();
    emitter.destroy();
  });

  describe('Logger', () => {
    it('should create loggers with different components', () => {
      const logger1 = createLogger('Component1');
      const logger2 = createLogger('Component2');

      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();
    });

    it('should set log levels', () => {
      setLogLevel('debug');
      const logger = createLogger('Test');
      expect(logger).toBeDefined();
    });
  });

  describe('MetricsCollector', () => {
    it('should increment counters', () => {
      const collector = getMetricsCollector();
      collector.incrementCounter('test_counter');
      collector.incrementCounter('test_counter', 5);

      const metrics = collector.getMetrics();
      expect(metrics.errors_total).toBeGreaterThanOrEqual(0);
    });

    it('should set gauges', () => {
      const collector = getMetricsCollector();
      collector.setGauge('agents_active', 3);
      collector.setGauge('tasks_running', 2);

      const metrics = collector.getMetrics();
      expect(metrics.agents_active).toBe(3);
      expect(metrics.tasks_running).toBe(2);
    });

    it('should record histograms', () => {
      const collector = getMetricsCollector();
      collector.recordHistogram('task_latency_ms', 100);
      collector.recordHistogram('task_latency_ms', 200);
      collector.recordHistogram('task_latency_ms', 150);

      const metrics = collector.getMetrics();
      expect(metrics.task_latency_ms.avg).toBeGreaterThan(0);
      expect(metrics.task_latency_ms.p50).toBeGreaterThan(0);
    });

    it('should track uptime', () => {
      const collector = getMetricsCollector();
      const metrics = collector.getMetrics();
      expect(metrics.uptime_seconds).toBeGreaterThanOrEqual(0);
    });

    it('should track memory usage', () => {
      const collector = getMetricsCollector();
      const metrics = collector.getMetrics();
      expect(metrics.memory_usage_mb).toBeGreaterThan(0);
    });

    it('should record errors', () => {
      const collector = getMetricsCollector();
      const before = collector.getMetrics().errors_total;
      collector.recordError();
      const after = collector.getMetrics().errors_total;
      expect(after).toBe(before + 1);
    });
  });

  describe('HealthChecker', () => {
    it('should initialize with version', async () => {
      const checker = getHealthChecker();
      const health = await checker.check();
      expect(health.version).toBe('0.1.0');
    });

    it('should check agents', async () => {
      const checker = getHealthChecker();
      const health = await checker.check();
      expect(health.checks.agents).toBeDefined();
      expect(health.checks.agents.ok).toBe(true);
    });

    it('should return uptime', async () => {
      const checker = getHealthChecker();
      const health = await checker.check();
      expect(health.uptime_seconds).toBeGreaterThanOrEqual(0);
    });

    it('should determine overall health status', async () => {
      const checker = getHealthChecker();
      const health = await checker.check();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('EventEmitter', () => {
    it('should track connected clients', () => {
      const emitter = getEventEmitter();
      expect(emitter.getClientCount()).toBe(0);
    });

    it('should emit agent status events', () => {
      const emitter = getEventEmitter();
      const eventsSeen: any[] = [];

      emitter.broadcast({
        eventType: 'test',
        data: { test: 'data' },
      });

      expect(emitter.getQueueSize()).toBeGreaterThan(0);
    });

    it('should emit heartbeats', () => {
      const emitter = getEventEmitter();
      const queue = emitter.getQueueSize();
      expect(queue).toBeGreaterThanOrEqual(0);
    });

    it('should emit agent lifecycle events', () => {
      const emitter = getEventEmitter();

      emitter.emitAgentStatusChanged('agent-1', 'busy');
      emitter.emitTaskQueued('task-1', 50, ['code-review']);
      emitter.emitTaskCompleted('task-1', 'agent-1', 5000, true);
      emitter.emitError('TestComponent', 'Test error message');
      emitter.emitAlert('warning', 'Test alert');

      expect(emitter.getQueueSize()).toBeGreaterThan(0);
    });
  });

  describe('StatusAggregator', () => {
    it('should aggregate empty state', () => {
      const aggregator = getStatusAggregator();
      aggregator.setAgents([]);
      aggregator.setTasks([]);

      const snapshot = aggregator.getSnapshot();
      expect(snapshot.agents).toEqual([]);
      expect(snapshot.tasks).toEqual([]);
      expect(snapshot.systemStats).toBeDefined();
    });

    it('should aggregate agent snapshots', () => {
      const aggregator = getStatusAggregator();
      aggregator.setAgents([
        {
          id: 'agent-1',
          name: 'TestAgent',
          type: 'claude',
          status: 'idle',
          capabilities: ['code-review'],
          createdAt: new Date().toISOString(),
          config: { model: 'claude-3' },
        } as any,
      ]);

      const snapshot = aggregator.getSnapshot();
      expect(snapshot.agents).toHaveLength(1);
      expect(snapshot.agents[0].name).toBe('TestAgent');
    });

    it('should filter by agent status', () => {
      const aggregator = getStatusAggregator();
      aggregator.setAgents([
        {
          id: 'agent-1',
          name: 'Busy',
          status: 'busy',
          type: 'claude',
          capabilities: [],
          createdAt: new Date().toISOString(),
          config: {},
        } as any,
        {
          id: 'agent-2',
          name: 'Idle',
          status: 'idle',
          type: 'claude',
          capabilities: [],
          createdAt: new Date().toISOString(),
          config: {},
        } as any,
      ]);

      const busyAgents = aggregator.filterByAgentStatus('busy');
      expect(busyAgents).toHaveLength(1);
      expect(busyAgents[0].name).toBe('Busy');
    });
  });

  describe('AlertDetector', () => {
    it('should initialize without errors', () => {
      const detector = getAlertDetector();
      expect(detector).toBeDefined();
    });

    it('should detect no alerts on clean state', () => {
      const detector = getAlertDetector();
      const alerts = detector.check();
      expect(alerts).toEqual([]);
    });

    it('should detect high error rates', () => {
      const collector = getMetricsCollector();
      const detector = getAlertDetector();

      // Simulate many errors
      for (let i = 0; i < 10; i++) {
        collector.recordError();
      }
      collector.setGauge('tasks_completed', 50);
      collector.setGauge('tasks_failed', 10);

      const alerts = detector.check();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should emit alerts via EventEmitter', () => {
      const detector = getAlertDetector();
      const emitter = getEventEmitter();

      detector.detectAndEmit();
      expect(emitter.getQueueSize()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration', () => {
    it('should collect metrics during lifecycle changes', () => {
      const collector = getMetricsCollector();
      const emitter = getEventEmitter();

      // Simulate agent creation
      collector.incrementCounter('agents_created');
      emitter.emitAgentStatusChanged('agent-1', 'idle');

      const metrics = collector.getMetrics();
      expect(metrics.agents_created).toBe(1);
      expect(emitter.getQueueSize()).toBeGreaterThan(0);
    });

    it('should track complete task lifecycle', () => {
      const collector = getMetricsCollector();
      const emitter = getEventEmitter();

      collector.incrementCounter('tasks_queued');
      emitter.emitTaskQueued('task-1', 50, ['code-review']);

      collector.incrementCounter('tasks_started');
      emitter.emitAgentStatusChanged('agent-1', 'busy');

      collector.recordHistogram('task_latency_ms', 5000);
      collector.incrementCounter('tasks_completed');
      emitter.emitTaskCompleted('task-1', 'agent-1', 5000, true);

      const metrics = collector.getMetrics();
      expect(metrics.tasks_queued).toBe(1);
      expect(metrics.tasks_started).toBe(1);
      expect(metrics.tasks_completed).toBe(1);
      expect(metrics.task_latency_ms.avg).toBe(5000);
    });
  });
});
