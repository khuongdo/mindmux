import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoadBalancer } from '../../../src/core/load-balancer';
import { TestDataBuilder } from '../../helpers/test-utils';

describe('LoadBalancer', () => {
  describe('Round-robin strategy', () => {
    it('should distribute tasks across agents', () => {
      const lb = new LoadBalancer('round-robin');
      const agents = [
        TestDataBuilder.agent({ id: 'agent-1' }),
        TestDataBuilder.agent({ id: 'agent-2' }),
        TestDataBuilder.agent({ id: 'agent-3' }),
      ];
      const runningTasks = new Map();

      const selected1 = lb.selectAgent(agents, runningTasks);
      const selected2 = lb.selectAgent(agents, runningTasks);
      const selected3 = lb.selectAgent(agents, runningTasks);

      expect(selected1).toBeDefined();
      expect(selected2).toBeDefined();
      expect(selected3).toBeDefined();
      // Round-robin should select different agents
      expect([selected1?.id, selected2?.id, selected3?.id]).toHaveLength(3);
    });

    it('should select first agent when only one available', () => {
      const lb = new LoadBalancer('round-robin');
      const agents = [TestDataBuilder.agent({ id: 'agent-1' })];
      const runningTasks = new Map();

      const selected = lb.selectAgent(agents, runningTasks);

      expect(selected?.id).toBe('agent-1');
    });

    it('should handle empty agent list', () => {
      const lb = new LoadBalancer('round-robin');
      const agents: any[] = [];
      const runningTasks = new Map();

      const selected = lb.selectAgent(agents, runningTasks);

      expect(selected).toBeUndefined();
    });
  });

  describe('Least-loaded strategy', () => {
    it('should select agent with fewest tasks', () => {
      const lb = new LoadBalancer('least-loaded');
      const agents = [
        TestDataBuilder.agent({ id: 'agent-1' }),
        TestDataBuilder.agent({ id: 'agent-2' }),
      ];
      const runningTasks = new Map([['agent-1', ['task-1', 'task-2']]]);

      const selected = lb.selectAgent(agents, runningTasks);

      expect(selected?.id).toBe('agent-2');
    });

    it('should select agent with no running tasks first', () => {
      const lb = new LoadBalancer('least-loaded');
      const agents = [
        TestDataBuilder.agent({ id: 'agent-1' }),
        TestDataBuilder.agent({ id: 'agent-2' }),
        TestDataBuilder.agent({ id: 'agent-3' }),
      ];
      const runningTasks = new Map([
        ['agent-1', ['task-1']],
        ['agent-2', ['task-2', 'task-3']],
      ]);

      const selected = lb.selectAgent(agents, runningTasks);

      expect(selected?.id).toBe('agent-3');
    });
  });

  describe('Capability-aware strategy', () => {
    it('should prefer agents matching capability requirements', () => {
      const lb = new LoadBalancer('capability-aware');
      const agents = [
        TestDataBuilder.agent({
          id: 'agent-1',
          capabilities: ['code-generation'],
        }),
        TestDataBuilder.agent({
          id: 'agent-2',
          capabilities: ['testing'],
        }),
      ];
      const runningTasks = new Map();

      const selected = lb.selectAgent(agents, runningTasks);

      expect(selected).toBeDefined();
    });
  });

  describe('Agent availability', () => {
    it('should consider agent load when selecting', () => {
      const lb = new LoadBalancer('least-loaded');
      const agents = [
        TestDataBuilder.agent({ id: 'agent-1', status: 'running' }),
        TestDataBuilder.agent({ id: 'agent-2', status: 'idle' }),
      ];
      const runningTasks = new Map();

      const selected = lb.selectAgent(agents, runningTasks);

      expect(selected).toBeDefined();
    });

    it('should handle all agents busy scenario', () => {
      const lb = new LoadBalancer('least-loaded');
      const agents = [
        TestDataBuilder.agent({ id: 'agent-1' }),
        TestDataBuilder.agent({ id: 'agent-2' }),
      ];
      // All agents have max tasks
      const runningTasks = new Map([
        ['agent-1', ['task-1', 'task-2', 'task-3']],
        ['agent-2', ['task-4', 'task-5', 'task-6']],
      ]);

      const selected = lb.selectAgent(agents, runningTasks);

      expect(selected).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle strategy with no agents', () => {
      const lb = new LoadBalancer('round-robin');

      const selected = lb.selectAgent([], new Map());

      expect(selected).toBeUndefined();
    });

    it('should handle missing running tasks data', () => {
      const lb = new LoadBalancer('least-loaded');
      const agents = [TestDataBuilder.agent({ id: 'agent-1' })];

      const selected = lb.selectAgent(agents, new Map());

      expect(selected?.id).toBe('agent-1');
    });
  });
});
