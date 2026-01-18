/**
 * Capability Matcher
 * Matches task requirements to agent capabilities
 */

import { Agent, Task } from './types';
import { AgentManager } from './agent-manager';

export class CapabilityMatcher {
  constructor(private agentManager: AgentManager) {}

  /**
   * Find all agents capable of executing the task
   * Returns agents with ALL required capabilities
   */
  findCapableAgents(task: Task): Agent[] {
    const agents = this.agentManager.listAgents();

    // Wildcard - any agent can handle
    if (task.requiredCapabilities.length === 0 ||
        task.requiredCapabilities.includes('*')) {
      return agents.filter(a => a.status !== 'unhealthy');
    }

    return agents.filter(agent => {
      // Skip unhealthy agents
      if (agent.status === 'unhealthy') return false;

      // Check if agent has ALL required capabilities
      return task.requiredCapabilities.every(
        cap => agent.capabilities.includes(cap)
      );
    });
  }

  /**
   * Find available (idle) agents from capable agents
   */
  findAvailableAgents(
    capableAgents: Agent[],
    runningTasks: Map<string, string[]>
  ): Agent[] {
    return capableAgents.filter(agent => {
      const agentTasks = runningTasks.get(agent.id) || [];
      const maxTasks = agent.config.maxConcurrentTasks || 1;

      // Agent available if running fewer than max concurrent tasks
      return agentTasks.length < maxTasks && agent.isRunning;
    });
  }

  /**
   * Check if a specific agent can handle the task
   */
  canAgentHandleTask(agent: Agent, task: Task): boolean {
    if (agent.status === 'unhealthy') return false;

    if (task.requiredCapabilities.length === 0 ||
        task.requiredCapabilities.includes('*')) {
      return true;
    }

    return task.requiredCapabilities.every(
      cap => agent.capabilities.includes(cap)
    );
  }
}
