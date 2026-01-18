/**
 * Agent lifecycle manager
 * Handles agent start, stop, monitoring, and health checks
 */

import { randomUUID } from 'crypto';
import { TmuxController } from './tmux-controller';
import { AgentManager } from './agent-manager';
import { TaskExecutor } from './task-executor';
import { Task } from './types';

export class AgentLifecycle {
  private taskExecutor: TaskExecutor;

  constructor(
    private tmuxController: TmuxController,
    private agentManager: AgentManager
  ) {
    this.taskExecutor = new TaskExecutor(tmuxController);
  }

  /**
   * Start an agent in a tmux session
   */
  async startAgent(agentId: string): Promise<void> {
    const agent = this.agentManager.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Check if agent is already running
    if (agent.isRunning && agent.sessionName) {
      if (await this.tmuxController.hasSession(agent.sessionName)) {
        throw new Error(`Agent ${agent.name} is already running in session ${agent.sessionName}`);
      }
    }

    try {
      // Create tmux session
      const sessionName = await this.tmuxController.createSession(
        agent.id,
        agent.name,
        agent.type
      );

      // Update agent with session info
      agent.sessionName = sessionName;
      agent.isRunning = true;
      agent.status = 'idle';
      agent.lastActivity = new Date().toISOString();
      this.agentManager.updateAgent(agent);

      // Spawn CLI process in session
      await this.taskExecutor.spawnCLI(agent);

      console.log(`Agent ${agent.name} started with ${agent.type} CLI`);

    } catch (error) {
      throw new Error(`Failed to start agent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stop a running agent
   */
  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agentManager.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.sessionName) {
      throw new Error(`Agent ${agent.name} has no active session`);
    }

    const sessionName = agent.sessionName;

    try {
      // Terminate CLI process gracefully
      await this.taskExecutor.terminateCLI(agent);

      // Wait for CLI to exit
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Kill tmux session
      await this.tmuxController.killSession(sessionName);

      // Update agent status
      agent.isRunning = false;
      agent.status = 'idle';
      agent.lastActivity = new Date().toISOString();
      this.agentManager.updateAgent(agent);

    } catch (error) {
      throw new Error(`Failed to stop agent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get agent logs from tmux session
   */
  async getAgentLogs(agentId: string, lines: number = 100): Promise<string> {
    const agent = this.agentManager.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.sessionName) {
      throw new Error(`Agent ${agent.name} has no active session`);
    }

    const sessionName = agent.sessionName;

    if (!await this.tmuxController.hasSession(sessionName)) {
      throw new Error(`Agent ${agent.name} session not found. Session may have been terminated.`);
    }

    return await this.tmuxController.captureOutput(sessionName, lines);
  }

  /**
   * Monitor agent health (check if session is alive)
   */
  async monitorAgentHealth(agentId: string): Promise<boolean> {
    const agent = this.agentManager.getAgent(agentId);
    if (!agent || !agent.sessionName) {
      return false;
    }

    const sessionExists = await this.tmuxController.hasSession(agent.sessionName);

    // Update agent status if session state changed
    if (agent.isRunning && !sessionExists) {
      agent.isRunning = false;
      agent.status = 'unhealthy';
      this.agentManager.updateAgent(agent);
    }

    return sessionExists;
  }

  /**
   * Recover orphaned sessions on startup
   * Cleans up sessions for deleted agents
   */
  async recoverOrphanedSessions(): Promise<void> {
    const tmuxSessions = await this.tmuxController.listSessions();
    const agents = this.agentManager.listAgents();
    const agentIds = new Set(agents.map(a => a.id));

    const orphanedSessions: string[] = [];

    for (const session of tmuxSessions) {
      const agentId = session.replace('mindmux-', '');
      if (!agentIds.has(agentId)) {
        // Orphaned session - cleanup
        await this.tmuxController.killSession(session);
        orphanedSessions.push(session);
      }
    }

    if (orphanedSessions.length > 0) {
      console.log(`Cleaned up ${orphanedSessions.length} orphaned session(s): ${orphanedSessions.join(', ')}`);
    }

    // Update running agents with session status
    for (const agent of agents) {
      if (agent.sessionName && agent.isRunning) {
        const sessionExists = await this.tmuxController.hasSession(agent.sessionName);
        if (!sessionExists) {
          agent.isRunning = false;
          agent.status = 'idle';
          this.agentManager.updateAgent(agent);
        }
      }
    }
  }

  /**
   * List all running agents
   */
  async listRunningAgents(): Promise<Array<{ agentId: string; agentName: string; sessionName: string }>> {
    const agents = this.agentManager.listAgents();
    const running: Array<{ agentId: string; agentName: string; sessionName: string }> = [];

    for (const agent of agents) {
      if (agent.sessionName && await this.tmuxController.hasSession(agent.sessionName)) {
        running.push({
          agentId: agent.id,
          agentName: agent.name,
          sessionName: agent.sessionName,
        });
      }
    }

    return running;
  }

  /**
   * Stop all running agents
   */
  async stopAllAgents(): Promise<void> {
    const agents = this.agentManager.listAgents();

    for (const agent of agents) {
      if (agent.isRunning && agent.sessionName) {
        try {
          await this.stopAgent(agent.id);
        } catch (error) {
          console.error(`Failed to stop agent ${agent.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  /**
   * Execute task on agent
   */
  async executeTask(agentId: string, prompt: string): Promise<Task> {
    const agent = this.agentManager.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.isRunning || !agent.sessionName) {
      throw new Error(`Agent ${agent.name} is not running. Start the agent first.`);
    }

    // Create task
    const task: Task = {
      id: randomUUID(),
      agentId: agent.id,
      prompt,
      status: 'pending',
      priority: 50,
      requiredCapabilities: [],
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    };

    try {
      // Update task status to running
      task.status = 'running';
      task.startedAt = new Date().toISOString();

      // Update agent status to busy
      agent.status = 'busy';
      agent.lastActivity = new Date().toISOString();
      this.agentManager.updateAgent(agent);

      // Execute task
      const result = await this.taskExecutor.executeTask(agent, task);

      // Update task with result
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = result;

      // Reset agent status to idle
      agent.status = 'idle';
      agent.lastActivity = new Date().toISOString();
      this.agentManager.updateAgent(agent);

      return task;
    } catch (error) {
      // Mark task as failed
      task.status = 'failed';
      task.completedAt = new Date().toISOString();
      task.error = error instanceof Error ? error.message : String(error);

      // Reset agent status to idle
      agent.status = 'idle';
      agent.lastActivity = new Date().toISOString();
      this.agentManager.updateAgent(agent);

      throw error;
    }
  }
}
