import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentManager } from '../../../src/core/agent-manager';
import { ConfigManager } from '../../../src/core/config-manager';
import { mockAgent1, mockAgent2, createMockAgent } from '../../fixtures/mock-agents';
import { TestDataBuilder } from '../../helpers/test-utils';

// Mock dependencies
vi.mock('../../../src/utils/paths', () => ({
  getGlobalAgentsPath: vi.fn(() => '/mock/agents.json'),
  getProjectAgentsPath: vi.fn(() => null),
  hasProjectConfig: vi.fn(() => false),
}));

vi.mock('../../../src/utils/file-operations', () => ({
  atomicWriteJSON: vi.fn(),
  safeReadJSON: vi.fn(() => null),
}));

vi.mock('../../../src/utils/json-validator', () => ({
  validateAgent: vi.fn((data) => data),
  validateAgentsStore: vi.fn((data) => data || { agents: [] }),
  safeValidate: vi.fn((data) => data),
}));

vi.mock('../../../src/monitoring/metrics-collector', () => ({
  getMetricsCollector: vi.fn(() => ({
    incrementCounter: vi.fn(),
    recordGauge: vi.fn(),
  })),
}));

vi.mock('../../../src/monitoring/event-emitter', () => ({
  getEventEmitter: vi.fn(() => ({
    broadcast: vi.fn(),
    emitTaskQueued: vi.fn(),
  })),
}));

vi.mock('../../../src/monitoring/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('AgentManager', () => {
  let agentManager: AgentManager;
  let mockConfigManager: ConfigManager;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock config manager
    mockConfigManager = {
      getConfig: vi.fn().mockReturnValue({
        defaultModel: {
          claude: 'claude-opus-4-5-20250929',
          gemini: 'gemini-2-5-flash',
          gpt4: 'gpt-4-turbo',
          opencode: 'opencode-latest',
        },
        timeout: 3600000,
      }),
    } as any;

    agentManager = new AgentManager(mockConfigManager);
  });

  describe('createAgent', () => {
    it('should create a new agent with valid params', () => {
      const agent = agentManager.createAgent('test-agent', 'claude', ['code-generation']);

      expect(agent).toBeDefined();
      expect(agent.name).toBe('test-agent');
      expect(agent.type).toBe('claude');
      expect(agent.capabilities).toContain('code-generation');
      expect(agent.status).toBe('idle');
    });

    it('should throw error if agent with same name exists', () => {
      agentManager.createAgent('duplicate-agent', 'claude', ['code-generation']);

      expect(() => {
        agentManager.createAgent('duplicate-agent', 'gemini', ['testing']);
      }).toThrow('Agent with name "duplicate-agent" already exists');
    });

    it('should use default model from config if not provided', () => {
      const agent = agentManager.createAgent('test-agent', 'claude', ['code-generation']);

      expect(agent.config?.model).toBe('claude-opus-4-5-20250929');
    });

    it('should use provided model if specified', () => {
      const agent = agentManager.createAgent('test-agent', 'claude', ['code-generation'], {
        model: 'custom-model',
      });

      expect(agent.config?.model).toBe('custom-model');
    });

    it('should set status to idle by default', () => {
      const agent = agentManager.createAgent('test-agent', 'claude', ['code-generation']);

      expect(agent.status).toBe('idle');
    });

    it('should generate unique agent IDs', () => {
      const agent1 = agentManager.createAgent('agent-1', 'claude', ['code-generation']);
      const agent2 = agentManager.createAgent('agent-2', 'gemini', ['testing']);

      expect(agent1.id).not.toBe(agent2.id);
    });
  });

  describe('getAgent', () => {
    it('should return agent by ID', () => {
      const created = agentManager.createAgent('test-agent', 'claude', ['code-generation']);
      const found = agentManager.getAgent(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null if agent not found', () => {
      const found = agentManager.getAgent('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('getAgentByName', () => {
    it('should return agent by name', () => {
      agentManager.createAgent('test-agent', 'claude', ['code-generation']);
      const found = agentManager.getAgentByName('test-agent');

      expect(found).toBeDefined();
      expect(found?.name).toBe('test-agent');
    });

    it('should return null if agent not found by name', () => {
      const found = agentManager.getAgentByName('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('listAgents', () => {
    it('should return empty list when no agents exist', () => {
      const agents = agentManager.listAgents();

      expect(agents).toEqual([]);
    });

    it('should return all created agents', () => {
      agentManager.createAgent('agent-1', 'claude', ['code-generation']);
      agentManager.createAgent('agent-2', 'gemini', ['testing']);
      agentManager.createAgent('agent-3', 'gpt4', ['documentation']);

      const agents = agentManager.listAgents();

      expect(agents).toHaveLength(3);
    });
  });

  describe('deleteAgent', () => {
    it('should delete agent by ID', () => {
      const created = agentManager.createAgent('test-agent', 'claude', ['code-generation']);
      const deleted = agentManager.deleteAgent(created.id);

      expect(deleted).toBe(true);
      expect(agentManager.getAgent(created.id)).toBeNull();
    });

    it('should delete agent by name', () => {
      agentManager.createAgent('test-agent', 'claude', ['code-generation']);
      const deleted = agentManager.deleteAgent('test-agent');

      expect(deleted).toBe(true);
      expect(agentManager.getAgentByName('test-agent')).toBeNull();
    });

    it('should return false if agent not found', () => {
      const deleted = agentManager.deleteAgent('non-existent');

      expect(deleted).toBe(false);
    });
  });

  describe('updateAgentStatus', () => {
    it('should update agent status by ID', () => {
      const created = agentManager.createAgent('test-agent', 'claude', ['code-generation']);
      const updated = agentManager.updateAgentStatus(created.id, 'running');

      expect(updated).toBe(true);
      const agent = agentManager.getAgent(created.id);
      expect(agent?.status).toBe('running');
    });

    it('should update agent status by name', () => {
      agentManager.createAgent('test-agent', 'claude', ['code-generation']);
      const updated = agentManager.updateAgentStatus('test-agent', 'stopped');

      expect(updated).toBe(true);
      const agent = agentManager.getAgentByName('test-agent');
      expect(agent?.status).toBe('stopped');
    });

    it('should return false if agent not found', () => {
      const updated = agentManager.updateAgentStatus('non-existent', 'running');

      expect(updated).toBe(false);
    });

    it('should update lastActivity timestamp', () => {
      const created = agentManager.createAgent('test-agent', 'claude', ['code-generation']);
      const beforeUpdate = new Date();

      agentManager.updateAgentStatus(created.id, 'running');

      const agent = agentManager.getAgent(created.id);
      const lastActivity = new Date(agent!.lastActivity || 0);

      expect(lastActivity.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('updateAgent', () => {
    it('should update agent properties', () => {
      const created = agentManager.createAgent('test-agent', 'claude', ['code-generation']);
      const updated = { ...created, status: 'running' as const };

      agentManager.updateAgent(updated);

      const agent = agentManager.getAgent(created.id);
      expect(agent?.status).toBe('running');
    });
  });

  describe('Repository integration', () => {
    it('should set repository', () => {
      const mockRepository = {
        create: vi.fn(),
      };

      agentManager.setRepository(mockRepository as any);

      expect(agentManager['agentRepository']).toBe(mockRepository);
    });
  });

  describe('Agent capabilities', () => {
    it('should support multiple capabilities', () => {
      const capabilities = ['code-generation', 'code-review', 'debugging'];
      const agent = agentManager.createAgent('test-agent', 'claude', capabilities);

      expect(agent.capabilities).toEqual(capabilities);
    });

    it('should accept empty capabilities array', () => {
      const agent = agentManager.createAgent('test-agent', 'claude', []);

      expect(agent.capabilities).toEqual([]);
    });
  });

  describe('Agent types', () => {
    it('should support claude type', () => {
      const agent = agentManager.createAgent('test-agent', 'claude', ['code-generation']);
      expect(agent.type).toBe('claude');
    });

    it('should support gemini type', () => {
      const agent = agentManager.createAgent('test-agent', 'gemini', ['testing']);
      expect(agent.type).toBe('gemini');
    });

    it('should support gpt4 type', () => {
      const agent = agentManager.createAgent('test-agent', 'gpt4', ['documentation']);
      expect(agent.type).toBe('gpt4');
    });

    it('should support opencode type', () => {
      const agent = agentManager.createAgent('test-agent', 'opencode', ['code-generation']);
      expect(agent.type).toBe('opencode');
    });
  });
});
