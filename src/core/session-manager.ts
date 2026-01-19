/**
 * Session manager
 * Handles session persistence and recovery
 */

import { AgentLifecycle } from './agent-lifecycle.js';
import { Session } from './types.js';
import { randomUUID } from 'crypto';

export class SessionManager {
  private activeSessions: Map<string, Session> = new Map();

  constructor(private lifecycle?: AgentLifecycle) {}

  /**
   * Initialize session manager on CLI startup
   * Recovers orphaned sessions and syncs agent states
   */
  async initializeOnStartup(): Promise<void> {
    try {
      // Recover orphaned sessions
      await this.lifecycle.recoverOrphanedSessions();

      // Log recovery complete
      const runningAgents = await this.lifecycle.listRunningAgents();
      if (runningAgents.length > 0) {
        console.log(`Found ${runningAgents.length} running agent(s):`);
        runningAgents.forEach(({ agentName, sessionName }) => {
          console.log(`  - ${agentName} (${sessionName})`);
        });
      }
    } catch (error) {
      console.error(`Session recovery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cleanup on shutdown
   * Optional: kills all agent sessions or leaves them running
   */
  async cleanupOnShutdown(killAllSessions: boolean = false): Promise<void> {
    try {
      if (killAllSessions) {
        console.log('Stopping all running agents...');
        await this.lifecycle.stopAllAgents();
        console.log('All agents stopped');
      } else {
        // Leave sessions running for persistence
        const runningAgents = await this.lifecycle.listRunningAgents();
        if (runningAgents.length > 0) {
          console.log(`Leaving ${runningAgents.length} agent(s) running`);
        }
      }
    } catch (error) {
      console.error(`Shutdown cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Health check for all agents
   * Updates agent statuses based on session availability
   */
  async healthCheckAllAgents(): Promise<Map<string, boolean>> {
    const runningAgents = await this.lifecycle.listRunningAgents();
    const healthMap = new Map<string, boolean>();

    for (const { agentId } of runningAgents) {
      const isHealthy = await this.lifecycle.monitorAgentHealth(agentId);
      healthMap.set(agentId, isHealthy);
    }

    return healthMap;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalRunning: number;
    healthy: number;
    unhealthy: number;
  }> {
    const healthMap = await this.healthCheckAllAgents();
    const healthy = Array.from(healthMap.values()).filter(h => h).length;
    const unhealthy = healthMap.size - healthy;

    return {
      totalRunning: healthMap.size,
      healthy,
      unhealthy,
    };
  }

  /**
   * Create a new session for an agent
   */
  async createSession(agentId: string): Promise<Session & { sessionId: string }> {
    const sessionId = randomUUID();
    const session: Session = {
      id: sessionId,
      agentId,
      tmuxSession: `mindmux-${sessionId.substring(0, 8)}`,
      status: 'active',
      startedAt: new Date().toISOString(),
    };
    this.activeSessions.set(sessionId, session);
    return { ...session, sessionId };
  }

  /**
   * Kill a session by ID
   */
  async killSession(sessionId: string): Promise<boolean> {
    // Try to find by sessionId
    let session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'terminated';
      session.endedAt = new Date().toISOString();
      this.activeSessions.delete(sessionId);
      return true;
    }
    return false;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): (Session & { sessionId: string }) | null {
    const session = this.activeSessions.get(sessionId);
    return session ? { ...session, sessionId } : null;
  }

  /**
   * List all active sessions
   */
  listActiveSessions(): Session[] {
    return Array.from(this.activeSessions.values()).filter(s => s.status !== 'terminated');
  }

  /**
   * Cleanup orphaned sessions
   */
  async cleanupOrphanedSessions(): Promise<number> {
    const before = this.activeSessions.size;
    // Clean sessions without heartbeat (simplified for tests)
    this.activeSessions.forEach((session, id) => {
      const startTime = new Date(session.startedAt).getTime();
      const now = Date.now();
      // If session is older than 24 hours, consider it orphaned
      if (now - startTime > 24 * 60 * 60 * 1000) {
        this.activeSessions.delete(id);
      }
    });
    return before - this.activeSessions.size;
  }
}
