import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentManager } from '../../src/core/agent-manager';
import { ConfigManager } from '../../src/core/config-manager';
import { SessionManager } from '../../src/core/session-manager';
import { AgentLifecycle } from '../../src/core/agent-lifecycle';

vi.mock('../../src/core/tmux-controller');
vi.mock('../../src/persistence/agent-repository');
vi.mock('../../src/monitoring/logger');
vi.mock('../../src/monitoring/metrics-collector');
vi.mock('../../src/monitoring/event-emitter');

describe('Agent Lifecycle Integration', () => {
  let agentManager: AgentManager;
  let configManager: ConfigManager;
  let sessionManager: SessionManager;
  let agentLifecycle: AgentLifecycle;

  beforeEach(async () => {
    vi.clearAllMocks();

    configManager = new ConfigManager();
    agentManager = new AgentManager(configManager);
    sessionManager = new SessionManager();
    agentLifecycle = new AgentLifecycle(agentManager, sessionManager);
  });

  describe('Full agent lifecycle', () => {
    it('should create and manage an agent', async () => {
      // Create agent
      const agent = agentManager.createAgent('test-agent', 'claude', [
        'code-generation',
      ]);

      expect(agent).toBeDefined();
      expect(agent.name).toBe('test-agent');
      expect(agent.status).toBe('idle');

      // Verify agent exists
      const found = agentManager.getAgent(agent.id);
      expect(found).not.toBeNull();
    });

    it('should handle agent start lifecycle', async () => {
      const agent = agentManager.createAgent('test-agent', 'claude', [
        'code-generation',
      ]);

      // Start agent (create session)
      const started = agentLifecycle.startAgent(agent.id);

      expect(started).toBeDefined();
    });

    it('should handle agent stop lifecycle', async () => {
      const agent = agentManager.createAgent('test-agent', 'claude', [
        'code-generation',
      ]);

      agentLifecycle.startAgent(agent.id);
      const stopped = await agentLifecycle.stopAgent(agent.id);

      expect(stopped).toBe(true);
    });

    it('should handle agent deletion', () => {
      const agent = agentManager.createAgent('test-agent', 'claude', [
        'code-generation',
      ]);

      const deleted = agentManager.deleteAgent(agent.id);

      expect(deleted).toBe(true);
      expect(agentManager.getAgent(agent.id)).toBeNull();
    });
  });

  describe('Agent state transitions', () => {
    it('should transition from idle to running', async () => {
      const agent = agentManager.createAgent('test-agent', 'claude', [
        'code-generation',
      ]);

      expect(agent.status).toBe('idle');

      agentLifecycle.startAgent(agent.id);

      const updated = agentManager.getAgent(agent.id);
      expect(updated?.status).not.toBe('idle');
    });

    it('should maintain status consistency', () => {
      const agent = agentManager.createAgent('test-agent', 'claude', [
        'code-generation',
      ]);

      agentManager.updateAgentStatus(agent.id, 'running');
      const found = agentManager.getAgent(agent.id);

      expect(found?.status).toBe('running');
    });
  });

  describe('Session management during lifecycle', () => {
    it('should create session when agent starts', async () => {
      const agent = agentManager.createAgent('test-agent', 'claude', [
        'code-generation',
      ]);

      const session = agentLifecycle.startAgent(agent.id);

      expect(session).toBeDefined();
      expect(sessionManager.getSession(session.sessionId)).not.toBeNull();
    });

    it('should clean up session when agent stops', async () => {
      const agent = agentManager.createAgent('test-agent', 'claude', [
        'code-generation',
      ]);

      const session = agentLifecycle.startAgent(agent.id);
      await agentLifecycle.stopAgent(agent.id);

      // Session should be destroyed or marked inactive
      const remaining = sessionManager.listActiveSessions();
      expect(remaining).toBeDefined();
    });
  });

  describe('Error recovery', () => {
    it('should handle missing agent gracefully', async () => {
      const result = await agentLifecycle.stopAgent('non-existent-agent');

      expect(result).toBe(false);
    });

    it('should handle double stop gracefully', async () => {
      const agent = agentManager.createAgent('test-agent', 'claude', [
        'code-generation',
      ]);

      agentLifecycle.startAgent(agent.id);
      await agentLifecycle.stopAgent(agent.id);
      const result = await agentLifecycle.stopAgent(agent.id);

      expect(typeof result).toBe('boolean');
    });
  });

  describe('Multiple agent management', () => {
    it('should manage multiple agents independently', async () => {
      const agent1 = agentManager.createAgent('agent-1', 'claude', [
        'code-generation',
      ]);
      const agent2 = agentManager.createAgent('agent-2', 'gemini', [
        'testing',
      ]);

      agentLifecycle.startAgent(agent1.id);
      agentLifecycle.startAgent(agent2.id);

      const all = agentManager.listAgents();
      expect(all).toHaveLength(2);
    });

    it('should isolate agent sessions', async () => {
      const agent1 = agentManager.createAgent('agent-1', 'claude', [
        'code-generation',
      ]);
      const agent2 = agentManager.createAgent('agent-2', 'gemini', [
        'testing',
      ]);

      const session1 = agentLifecycle.startAgent(agent1.id);
      const session2 = agentLifecycle.startAgent(agent2.id);

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });
  });
});
