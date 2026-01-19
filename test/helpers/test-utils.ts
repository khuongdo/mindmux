import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Test utilities for common patterns and assertions
 */

/**
 * Create a mock async function that resolves with a given value
 */
export function createMockAsyncFn<T>(resolveValue?: T) {
  return vi.fn(async () => resolveValue);
}

/**
 * Create a mock async function that rejects with an error
 */
export function createMockAsyncErrorFn(error: Error) {
  return vi.fn(async () => {
    throw error;
  });
}

/**
 * Delay execution by N milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 1000,
  interval = 50,
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('waitFor timeout exceeded');
    }
    await delay(interval);
  }
}

/**
 * Create test data builder pattern
 */
export class TestDataBuilder {
  static agent(overrides = {}) {
    return {
      id: 'test-agent-1',
      name: 'test-agent',
      type: 'claude',
      model: 'claude-opus-4-5-20250929',
      capabilities: ['code-generation', 'code-review'],
      status: 'stopped' as const,
      sessionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static task(overrides = {}) {
    return {
      id: 'test-task-1',
      name: 'test-task',
      prompt: 'Write a test',
      status: 'pending' as const,
      priority: 'medium' as const,
      assignedAgentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static config(overrides = {}) {
    return {
      version: '0.1.0',
      defaultAgentType: 'claude',
      defaultModel: {
        claude: 'claude-opus-4-5-20250929',
        gemini: 'gemini-2-5-flash',
        gpt4: 'gpt-4-turbo',
        opencode: 'opencode-latest',
      },
      timeout: 3600000,
      maxConcurrentAgents: 10,
      logging: {
        level: 'info',
        enableAgentLogs: true,
        maxLogSizeMB: 100,
      },
      tmux: {
        sessionPrefix: 'mindmux',
        keepSessionsAlive: true,
      },
      ...overrides,
    };
  }
}

/**
 * Mock timer helper for deterministic time-based tests
 */
export class MockTimerHelper {
  private originalDateNow: typeof Date.now;

  constructor(private startTime = Date.now()) {
    this.originalDateNow = Date.now;
    this.patchNow();
  }

  private patchNow() {
    let currentTime = this.startTime;
    global.Date.now = vi.fn(() => currentTime);

    vi.useFakeTimers();
  }

  advance(ms: number) {
    vi.advanceTimersByTime(ms);
  }

  restore() {
    vi.restoreAllMocks();
    vi.useRealTimers();
    global.Date.now = this.originalDateNow;
  }
}

/**
 * Custom matcher for API responses
 */
export function expectApiSuccess<T>(response: any, statusCode = 200) {
  expect(response).toBeDefined();
  expect(response.status).toBe(statusCode);
  expect(response.data).toBeDefined();
  return response.data;
}

export function expectApiError(response: any, statusCode: number) {
  expect(response).toBeDefined();
  expect(response.status).toBe(statusCode);
  expect(response.error).toBeDefined();
}
