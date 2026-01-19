import { vi } from 'vitest';
import type { Agent } from '../../src/core/types';

/**
 * Mock agents for testing
 */

export const mockAgent1: Agent = {
  id: 'agent-1',
  name: 'dev-agent',
  type: 'claude',
  model: 'claude-opus-4-5-20250929',
  capabilities: ['code-generation', 'code-review'],
  status: 'stopped',
  sessionId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockAgent2: Agent = {
  id: 'agent-2',
  name: 'test-agent',
  type: 'gemini',
  model: 'gemini-2-5-flash',
  capabilities: ['testing', 'debugging'],
  status: 'running',
  sessionId: 'tmux-session-2',
  createdAt: new Date('2024-01-02'),
  updatedAt: new Date('2024-01-02'),
};

export const mockAgent3: Agent = {
  id: 'agent-3',
  name: 'doc-agent',
  type: 'gpt4',
  model: 'gpt-4-turbo',
  capabilities: ['documentation'],
  status: 'stopped',
  sessionId: null,
  createdAt: new Date('2024-01-03'),
  updatedAt: new Date('2024-01-03'),
};

export function createMockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    ...mockAgent1,
    ...overrides,
  };
}

export const mockAgents = [mockAgent1, mockAgent2, mockAgent3];
