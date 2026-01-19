import { vi } from 'vitest';

/**
 * Mock tmux session manager for testing
 */

export class MockTmuxController {
  private sessions: Map<string, { sessionId: string; windowId: string; commands: string[] }> = new Map();

  createSession(sessionId: string) {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`);
    }

    this.sessions.set(sessionId, {
      sessionId,
      windowId: `${sessionId}:0`,
      commands: [],
    });

    return sessionId;
  }

  sessionExists(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  sendCommand(sessionId: string, command: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    session.commands.push(command);
  }

  killSession(sessionId: string): void {
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} not found`);
    }
    this.sessions.delete(sessionId);
  }

  getSessionOutput(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session.commands;
  }

  listSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  reset(): void {
    this.sessions.clear();
  }
}

/**
 * Mock function for creating tmux sessions
 */
export const createMockTmuxSession = vi.fn(async (sessionId: string) => ({
  sessionId,
  windowId: `${sessionId}:0`,
  attached: false,
}));

/**
 * Mock function for killing tmux sessions
 */
export const killMockTmuxSession = vi.fn(async (sessionId: string) => true);

/**
 * Mock function for listing tmux sessions
 */
export const listMockTmuxSessions = vi.fn(async () => [
  { sessionId: 'mindmux-agent-1', windows: 1 },
  { sessionId: 'mindmux-agent-2', windows: 1 },
]);
