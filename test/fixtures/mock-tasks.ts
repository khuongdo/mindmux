import type { Task } from '../../src/core/types';

/**
 * Mock tasks for testing
 */

export const mockTask1: Task = {
  id: 'task-1',
  name: 'generate-code',
  prompt: 'Generate a function to sort an array',
  status: 'pending',
  priority: 'high',
  assignedAgentId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockTask2: Task = {
  id: 'task-2',
  name: 'review-code',
  prompt: 'Review the authentication module for security issues',
  status: 'assigned',
  priority: 'medium',
  assignedAgentId: 'agent-1',
  createdAt: new Date('2024-01-02'),
  updatedAt: new Date('2024-01-02'),
};

export const mockTask3: Task = {
  id: 'task-3',
  name: 'write-tests',
  prompt: 'Write unit tests for the user service',
  status: 'completed',
  priority: 'medium',
  assignedAgentId: 'agent-2',
  createdAt: new Date('2024-01-03'),
  updatedAt: new Date('2024-01-03'),
};

export function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    ...mockTask1,
    ...overrides,
  };
}

export const mockTasks = [mockTask1, mockTask2, mockTask3];
