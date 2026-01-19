/**
 * Agent manager for CRUD operations
 * Handles agent lifecycle and persistence
 */

import { existsSync, readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import {
  getGlobalAgentsPath,
  getProjectAgentsPath,
  hasProjectConfig,
} from '../utils/paths.js';
import { Agent, AgentsStore, AgentType, AgentConfig } from './types.js';
import { ConfigManager } from './config-manager.js';
import { atomicWriteJSON, safeReadJSON } from '../utils/file-operations.js';
import {
  validateAgent,
  validateAgentsStore,
  safeValidate,
} from '../utils/json-validator.js';
import { AgentRepository } from '../persistence/agent-repository.js';

export class AgentManager {
  private configManager: ConfigManager;
  private agentRepository: AgentRepository | null = null;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  /**
   * Set agent repository for SQLite persistence (optional)
   */
  setRepository(repository: AgentRepository): void {
    this.agentRepository = repository;
  }

  /**
   * Create a new agent
   */
  createAgent(
    name: string,
    type: AgentType,
    capabilities: string[],
    config?: Partial<AgentConfig>
  ): Agent {
    // Check if agent with this name already exists
    const existing = this.getAgentByName(name);
    if (existing) {
      throw new Error(`Agent with name "${name}" already exists`);
    }

    const globalConfig = this.configManager.getConfig();

    const agent: Agent = {
      id: randomUUID(),
      name,
      type,
      capabilities,
      status: 'idle',
      createdAt: new Date().toISOString(),
      config: {
        model: config?.model || globalConfig.defaultModel[type],
        maxConcurrentTasks: config?.maxConcurrentTasks || 1,
        timeout: config?.timeout || globalConfig.timeout,
      },
    };

    // Save to SQLite if available, otherwise to JSON
    if (this.agentRepository) {
      try {
        this.agentRepository.create(agent);
      } catch (error) {
        console.warn('SQLite save failed, falling back to JSON:', error);
        this.saveAgent(agent);
      }
    } else {
      this.saveAgent(agent);
    }

    return agent;
  }

  /**
   * List all agents (merged from global and project, or from SQLite if available)
   */
  listAgents(): Agent[] {
    // If SQLite repository is available, use it
    if (this.agentRepository) {
      try {
        return this.agentRepository.getAll();
      } catch (error) {
        console.warn('SQLite retrieval failed, falling back to JSON:', error);
      }
    }

    // Fallback to JSON-based storage
    const globalAgents = this.loadGlobalAgents();
    const projectAgents = this.loadProjectAgents();

    // Merge agents, project agents override global if same ID
    const agentMap = new Map<string, Agent>();

    globalAgents.forEach(agent => agentMap.set(agent.id, agent));
    projectAgents.forEach(agent => agentMap.set(agent.id, agent));

    return Array.from(agentMap.values());
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): Agent | null {
    const agents = this.listAgents();
    return agents.find(agent => agent.id === id) || null;
  }

  /**
   * Get agent by name
   */
  getAgentByName(name: string): Agent | null {
    const agents = this.listAgents();
    return agents.find(agent => agent.name === name) || null;
  }

  /**
   * Delete agent by ID or name
   */
  deleteAgent(identifier: string): boolean {
    // Try by ID first, then by name
    let agent = this.getAgent(identifier);
    if (!agent) {
      agent = this.getAgentByName(identifier);
    }

    if (!agent) {
      return false;
    }

    // Remove from both global and project configs
    this.removeAgentFromStore(agent.id, getGlobalAgentsPath());

    const projectPath = getProjectAgentsPath();
    if (projectPath) {
      this.removeAgentFromStore(agent.id, projectPath);
    }

    return true;
  }

  /**
   * Update agent status
   */
  updateAgentStatus(identifier: string, status: Agent['status']): boolean {
    let agent = this.getAgent(identifier);
    if (!agent) {
      agent = this.getAgentByName(identifier);
    }

    if (!agent) {
      return false;
    }

    agent.status = status;
    agent.lastActivity = new Date().toISOString();

    this.updateAgent(agent);
    return true;
  }

  /**
   * Update agent
   */
  updateAgent(agent: Agent): void {
    // Determine which store the agent belongs to
    const globalAgents = this.loadGlobalAgents();
    const isGlobal = globalAgents.some(a => a.id === agent.id);

    if (isGlobal) {
      this.updateAgentInStore(agent, getGlobalAgentsPath());
    } else {
      const projectPath = getProjectAgentsPath();
      if (projectPath) {
        this.updateAgentInStore(agent, projectPath);
      }
    }
  }

  /**
   * Save agent to store
   */
  private saveAgent(agent: Agent): void {
    const path = getGlobalAgentsPath();
    const store = this.loadAgentsStore(path);

    // Validate agent before saving
    safeValidate(agent, validateAgent, 'new agent');

    store.agents.push(agent);

    atomicWriteJSON(path, store);
  }

  /**
   * Load global agents
   */
  private loadGlobalAgents(): Agent[] {
    return this.loadAgentsStore(getGlobalAgentsPath()).agents;
  }

  /**
   * Load project agents
   */
  private loadProjectAgents(): Agent[] {
    if (!hasProjectConfig()) return [];

    const path = getProjectAgentsPath();
    if (!path || !existsSync(path)) return [];

    return this.loadAgentsStore(path).agents;
  }

  /**
   * Load agents store from file
   */
  private loadAgentsStore(path: string): AgentsStore {
    if (!existsSync(path)) {
      return { agents: [] };
    }

    try {
      const data = safeReadJSON<AgentsStore>(path);
      if (!data) return { agents: [] };

      return safeValidate(data, validateAgentsStore, path);
    } catch (error) {
      console.error(`Error reading agents from ${path}: ${error}`);
      throw new Error(
        `Corrupted agents store at ${path}. Please check or delete the file.`
      );
    }
  }

  /**
   * Remove agent from store
   */
  private removeAgentFromStore(agentId: string, path: string): void {
    const store = this.loadAgentsStore(path);
    store.agents = store.agents.filter(agent => agent.id !== agentId);

    atomicWriteJSON(path, store);
  }

  /**
   * Update agent in store
   */
  private updateAgentInStore(agent: Agent, path: string): void {
    const store = this.loadAgentsStore(path);
    const index = store.agents.findIndex(a => a.id === agent.id);

    if (index !== -1) {
      // Validate agent before updating
      safeValidate(agent, validateAgent, 'updated agent');

      store.agents[index] = agent;
      atomicWriteJSON(path, store);
    }
  }
}
