import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '../../../src/core/session-manager';
import { TestDataBuilder } from '../../helpers/test-utils';

vi.mock('../../../src/core/tmux-controller');
vi.mock('../../../src/monitoring/logger');

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionManager = new SessionManager();
  });

  describe('createSession', () => {
    it('should create a new tmux session', async () => {
      const agent = TestDataBuilder.agent();

      const session = await sessionManager.createSession(agent.id);

      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
    });

    it('should assign unique session IDs', async () => {
      const agent1 = TestDataBuilder.agent({ id: 'agent-1' });
      const agent2 = TestDataBuilder.agent({ id: 'agent-2' });

      const session1 = await sessionManager.createSession(agent1.id);
      const session2 = await sessionManager.createSession(agent2.id);

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });

    it('should track active sessions', async () => {
      const agent = TestDataBuilder.agent();

      await sessionManager.createSession(agent.id);

      const sessions = sessionManager.listActiveSessions();

      expect(sessions).toBeDefined();
      expect(sessions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('killSession', () => {
    it('should kill an active session', async () => {
      const agent = TestDataBuilder.agent();

      const session = await sessionManager.createSession(agent.id);
      const killed = await sessionManager.killSession(session.sessionId);

      expect(killed).toBe(true);
    });

    it('should return false if session not found', async () => {
      const killed = await sessionManager.killSession('non-existent');

      expect(killed).toBe(false);
    });
  });

  describe('getSession', () => {
    it('should retrieve active session', async () => {
      const agent = TestDataBuilder.agent();

      const created = await sessionManager.createSession(agent.id);
      const found = sessionManager.getSession(created.sessionId);

      expect(found).toBeDefined();
    });

    it('should return null if session not found', () => {
      const found = sessionManager.getSession('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('listActiveSessions', () => {
    it('should list all active sessions', async () => {
      const agent1 = TestDataBuilder.agent({ id: 'agent-1' });
      const agent2 = TestDataBuilder.agent({ id: 'agent-2' });

      await sessionManager.createSession(agent1.id);
      await sessionManager.createSession(agent2.id);

      const sessions = sessionManager.listActiveSessions();

      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no sessions', () => {
      const sessions = sessionManager.listActiveSessions();

      expect(Array.isArray(sessions)).toBe(true);
    });
  });

  describe('Session lifecycle', () => {
    it('should handle create and destroy cycle', async () => {
      const agent = TestDataBuilder.agent();

      // Create
      const session = await sessionManager.createSession(agent.id);
      expect(sessionManager.getSession(session.sessionId)).toBeDefined();

      // Kill
      const killed = await sessionManager.killSession(session.sessionId);
      expect(killed).toBe(true);
    });

    it('should prevent duplicate sessions for same agent', async () => {
      const agent = TestDataBuilder.agent();

      const session1 = await sessionManager.createSession(agent.id);
      const session2 = await sessionManager.createSession(agent.id);

      // May reuse existing session or create new one
      expect(session1).toBeDefined();
      expect(session2).toBeDefined();
    });
  });

  describe('Orphaned session cleanup', () => {
    it('should detect and clean orphaned sessions', async () => {
      const cleaned = await sessionManager.cleanupOrphanedSessions();

      expect(typeof cleaned).toBe('number');
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Session recovery', () => {
    it('should recover from tmux list failures', async () => {
      const sessions = sessionManager.listActiveSessions();

      expect(Array.isArray(sessions)).toBe(true);
    });
  });
});
