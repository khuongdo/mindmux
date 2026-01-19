import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Global test setup
beforeAll(() => {
  // Silence logs during tests unless explicitly enabled
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';
});

afterAll(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.clearAllTimers();
});

afterEach(() => {
  vi.clearAllMocks();
});
