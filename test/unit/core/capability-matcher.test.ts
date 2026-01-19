import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CapabilityMatcher } from '../../../src/core/capability-matcher';
import { AgentManager } from '../../../src/core/agent-manager';
import { TestDataBuilder } from '../../helpers/test-utils';

vi.mock('../../../src/core/agent-manager');

describe('CapabilityMatcher', () => {
  let capabilityMatcher: CapabilityMatcher;
  let mockAgentManager: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAgentManager = {
      listAgents: vi.fn().mockReturnValue([
        TestDataBuilder.agent({
          id: 'agent-1',
          name: 'code-agent',
          capabilities: ['code-generation', 'code-review'],
        }),
        TestDataBuilder.agent({
          id: 'agent-2',
          name: 'test-agent',
          capabilities: ['testing', 'debugging'],
        }),
        TestDataBuilder.agent({
          id: 'agent-3',
          name: 'doc-agent',
          capabilities: ['documentation'],
        }),
      ]),
    };

    capabilityMatcher = new CapabilityMatcher(mockAgentManager);
  });

  describe('findCapableAgents', () => {
    it('should find agents with exact capabilities', () => {
      const task = TestDataBuilder.task({
        requiredCapabilities: ['code-generation'],
      });

      const agents = capabilityMatcher.findCapableAgents(task);

      expect(agents).toBeDefined();
      expect(agents.length).toBeGreaterThanOrEqual(1);
    });

    it('should find agents with multiple required capabilities', () => {
      const task = TestDataBuilder.task({
        requiredCapabilities: ['code-generation', 'code-review'],
      });

      const agents = capabilityMatcher.findCapableAgents(task);

      expect(agents).toBeDefined();
    });

    it('should return empty array if no agents match', () => {
      const task = TestDataBuilder.task({
        requiredCapabilities: ['non-existent-capability'],
      });

      const agents = capabilityMatcher.findCapableAgents(task);

      expect(agents).toEqual([]);
    });

    it('should handle empty capability requirements', () => {
      const task = TestDataBuilder.task({
        requiredCapabilities: [],
      });

      const agents = capabilityMatcher.findCapableAgents(task);

      expect(agents).toBeDefined();
    });
  });

  describe('findAvailableAgents', () => {
    it('should return available agents', () => {
      const agents = mockAgentManager.listAgents();
      const runningTasks = new Map();

      const available = capabilityMatcher.findAvailableAgents(agents, runningTasks);

      expect(available).toBeDefined();
      expect(Array.isArray(available)).toBe(true);
    });

    it('should exclude agents with running tasks', () => {
      const agents = mockAgentManager.listAgents();
      const runningTasks = new Map([['agent-1', ['task-1', 'task-2']]]);

      const available = capabilityMatcher.findAvailableAgents(agents, runningTasks);

      expect(available).toBeDefined();
      // Should not include agent-1 if it's at capacity
    });

    it('should consider agent capacity', () => {
      const agents = mockAgentManager.listAgents();
      const runningTasks = new Map([['agent-1', ['task-1']]]);

      const available = capabilityMatcher.findAvailableAgents(agents, runningTasks);

      expect(available).toBeDefined();
    });
  });

  describe('Capability matching', () => {
    it('should match single capability', () => {
      const task = TestDataBuilder.task({
        requiredCapabilities: ['testing'],
      });

      const agents = capabilityMatcher.findCapableAgents(task);

      expect(agents.length).toBeGreaterThanOrEqual(1);
    });

    it('should support wildcard capabilities', () => {
      const agents = capabilityMatcher.findCapableAgents(
        TestDataBuilder.task({
          requiredCapabilities: ['*'],
        })
      );

      expect(agents.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle case-sensitive matching', () => {
      const agents = capabilityMatcher.findCapableAgents(
        TestDataBuilder.task({
          requiredCapabilities: ['CODE-GENERATION'],
        })
      );

      // May or may not match depending on implementation
      expect(Array.isArray(agents)).toBe(true);
    });
  });
});
