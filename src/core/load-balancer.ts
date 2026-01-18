/**
 * Load Balancer
 * Selects optimal agent from available candidates
 */

import { Agent } from './types';

export type LoadBalancingStrategy = 'round-robin' | 'least-loaded';

export class LoadBalancer {
  private roundRobinIndex: number = 0;

  constructor(private strategy: LoadBalancingStrategy = 'round-robin') {}

  /**
   * Select best agent from available agents
   */
  selectAgent(
    availableAgents: Agent[],
    runningTasks: Map<string, string[]>
  ): Agent | null {
    if (availableAgents.length === 0) return null;

    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobin(availableAgents);
      case 'least-loaded':
        return this.leastLoaded(availableAgents, runningTasks);
      default:
        return this.roundRobin(availableAgents);
    }
  }

  /**
   * Round-robin selection
   */
  private roundRobin(agents: Agent[]): Agent {
    const agent = agents[this.roundRobinIndex % agents.length];
    this.roundRobinIndex++;
    return agent;
  }

  /**
   * Select agent with fewest running tasks
   */
  private leastLoaded(
    agents: Agent[],
    runningTasks: Map<string, string[]>
  ): Agent {
    return agents.reduce((best, current) => {
      const bestLoad = (runningTasks.get(best.id) || []).length;
      const currentLoad = (runningTasks.get(current.id) || []).length;
      return currentLoad < bestLoad ? current : best;
    });
  }

  /**
   * Calculate load score for an agent (0-1, lower is better)
   */
  getLoadScore(agent: Agent, runningTasks: Map<string, string[]>): number {
    const currentTasks = (runningTasks.get(agent.id) || []).length;
    const maxTasks = agent.config.maxConcurrentTasks || 1;
    return currentTasks / maxTasks;
  }
}
