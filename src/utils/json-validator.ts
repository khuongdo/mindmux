/**
 * Runtime JSON schema validation
 * Validates configuration and data structures without external dependencies
 */

import {
  MindMuxConfig,
  Agent,
  MindMuxMetadata,
  AgentType,
  AgentStatus,
  AgentsStore,
} from '../core/types.js';

// Validation error class
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate AgentType
 */
function isValidAgentType(value: unknown): value is AgentType {
  return (
    typeof value === 'string' &&
    ['claude', 'gemini', 'gpt4', 'opencode'].includes(value)
  );
}

/**
 * Validate AgentStatus
 */
function isValidAgentStatus(value: unknown): value is AgentStatus {
  return (
    typeof value === 'string' &&
    ['idle', 'busy', 'unhealthy'].includes(value)
  );
}

/**
 * Validate ISO 8601 date string
 */
function isValidISODate(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString() === value;
}

/**
 * Validate LoggingConfig
 */
function validateLoggingConfig(config: unknown): void {
  if (typeof config !== 'object' || config === null) {
    throw new ValidationError('logging config must be an object');
  }

  const cfg = config as Record<string, unknown>;

  if (!['debug', 'info', 'warn', 'error'].includes(cfg.level as string)) {
    throw new ValidationError(
      `logging.level must be debug|info|warn|error, got: ${cfg.level}`
    );
  }

  if (typeof cfg.enableAgentLogs !== 'boolean') {
    throw new ValidationError(
      'logging.enableAgentLogs must be boolean'
    );
  }

  if (typeof cfg.maxLogSizeMB !== 'number' || cfg.maxLogSizeMB <= 0) {
    throw new ValidationError(
      'logging.maxLogSizeMB must be positive number'
    );
  }
}

/**
 * Validate TmuxConfig
 */
function validateTmuxConfig(config: unknown): void {
  if (typeof config !== 'object' || config === null) {
    throw new ValidationError('tmux config must be an object');
  }

  const cfg = config as Record<string, unknown>;

  if (typeof cfg.sessionPrefix !== 'string' || cfg.sessionPrefix.length === 0) {
    throw new ValidationError(
      'tmux.sessionPrefix must be non-empty string'
    );
  }

  if (typeof cfg.keepSessionsAlive !== 'boolean') {
    throw new ValidationError(
      'tmux.keepSessionsAlive must be boolean'
    );
  }
}

/**
 * Validate MindMuxConfig
 */
export function validateMindMuxConfig(config: unknown): MindMuxConfig {
  if (typeof config !== 'object' || config === null) {
    throw new ValidationError('Config must be an object');
  }

  const cfg = config as Record<string, unknown>;

  // Validate version
  if (typeof cfg.version !== 'string') {
    throw new ValidationError('version must be string');
  }

  // Validate defaultAgentType
  if (!isValidAgentType(cfg.defaultAgentType)) {
    throw new ValidationError(
      `defaultAgentType must be claude|gemini|gpt4|opencode, got: ${cfg.defaultAgentType}`
    );
  }

  // Validate defaultModel
  if (typeof cfg.defaultModel !== 'object' || cfg.defaultModel === null) {
    throw new ValidationError('defaultModel must be an object');
  }

  const defaultModel = cfg.defaultModel as Record<string, unknown>;
  const requiredModels: AgentType[] = ['claude', 'gemini', 'gpt4', 'opencode'];

  for (const agentType of requiredModels) {
    if (typeof defaultModel[agentType] !== 'string') {
      throw new ValidationError(
        `defaultModel.${agentType} must be string`
      );
    }
  }

  // Validate timeout
  if (typeof cfg.timeout !== 'number' || cfg.timeout <= 0) {
    throw new ValidationError('timeout must be positive number');
  }

  // Validate maxConcurrentAgents
  if (
    typeof cfg.maxConcurrentAgents !== 'number' ||
    cfg.maxConcurrentAgents <= 0
  ) {
    throw new ValidationError(
      'maxConcurrentAgents must be positive number'
    );
  }

  // Validate logging
  validateLoggingConfig(cfg.logging);

  // Validate tmux
  validateTmuxConfig(cfg.tmux);

  return config as MindMuxConfig;
}

/**
 * Validate Agent
 */
export function validateAgent(agent: unknown): Agent {
  if (typeof agent !== 'object' || agent === null) {
    throw new ValidationError('Agent must be an object');
  }

  const a = agent as Record<string, unknown>;

  // Validate id (UUID v4 pattern)
  if (typeof a.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(a.id)) {
    throw new ValidationError(`id must be valid UUID v4, got: ${a.id}`);
  }

  // Validate name
  if (typeof a.name !== 'string' || a.name.length === 0) {
    throw new ValidationError('name must be non-empty string');
  }

  // Validate type
  if (!isValidAgentType(a.type)) {
    throw new ValidationError(
      `type must be claude|gemini|gpt4|opencode, got: ${a.type}`
    );
  }

  // Validate capabilities
  if (!Array.isArray(a.capabilities)) {
    throw new ValidationError('capabilities must be array');
  }

  for (const cap of a.capabilities) {
    if (typeof cap !== 'string') {
      throw new ValidationError('capabilities must be array of strings');
    }
  }

  // Validate status
  if (!isValidAgentStatus(a.status)) {
    throw new ValidationError(
      `status must be idle|busy|unhealthy, got: ${a.status}`
    );
  }

  // Validate createdAt
  if (!isValidISODate(a.createdAt)) {
    throw new ValidationError(
      `createdAt must be ISO 8601 date string, got: ${a.createdAt}`
    );
  }

  // Validate lastActivity (optional)
  if (a.lastActivity !== undefined && !isValidISODate(a.lastActivity)) {
    throw new ValidationError(
      `lastActivity must be ISO 8601 date string, got: ${a.lastActivity}`
    );
  }

  // Validate config
  if (typeof a.config !== 'object' || a.config === null) {
    throw new ValidationError('config must be an object');
  }

  const config = a.config as Record<string, unknown>;

  if (config.model !== undefined && typeof config.model !== 'string') {
    throw new ValidationError('config.model must be string');
  }

  if (
    config.maxConcurrentTasks !== undefined &&
    (typeof config.maxConcurrentTasks !== 'number' ||
      config.maxConcurrentTasks <= 0)
  ) {
    throw new ValidationError(
      'config.maxConcurrentTasks must be positive number'
    );
  }

  if (
    config.timeout !== undefined &&
    (typeof config.timeout !== 'number' || config.timeout <= 0)
  ) {
    throw new ValidationError('config.timeout must be positive number');
  }

  return agent as Agent;
}

/**
 * Validate MindMuxMetadata
 */
export function validateMindMuxMetadata(metadata: unknown): MindMuxMetadata {
  if (typeof metadata !== 'object' || metadata === null) {
    throw new ValidationError('Metadata must be an object');
  }

  const m = metadata as Record<string, unknown>;

  // Validate version
  if (typeof m.version !== 'string') {
    throw new ValidationError('version must be string');
  }

  // Validate installedAt
  if (!isValidISODate(m.installedAt)) {
    throw new ValidationError(
      `installedAt must be ISO 8601 date string, got: ${m.installedAt}`
    );
  }

  // Validate lastUpdated
  if (!isValidISODate(m.lastUpdated)) {
    throw new ValidationError(
      `lastUpdated must be ISO 8601 date string, got: ${m.lastUpdated}`
    );
  }

  // Validate userId (UUID v4 pattern)
  if (typeof m.userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(m.userId)) {
    throw new ValidationError(
      `userId must be valid UUID v4, got: ${m.userId}`
    );
  }

  return metadata as MindMuxMetadata;
}

/**
 * Validate AgentsStore
 */
export function validateAgentsStore(store: unknown): AgentsStore {
  if (typeof store !== 'object' || store === null) {
    throw new ValidationError('AgentsStore must be an object');
  }

  const s = store as Record<string, unknown>;

  if (!Array.isArray(s.agents)) {
    throw new ValidationError('agents must be an array');
  }

  // Validate each agent
  for (let i = 0; i < s.agents.length; i++) {
    try {
      validateAgent(s.agents[i]);
    } catch (error) {
      throw new ValidationError(
        `Invalid agent at index ${i}: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  return store as AgentsStore;
}

/**
 * Safe validator wrapper with helpful error messages
 */
export function safeValidate<T>(
  data: unknown,
  validator: (data: unknown) => T,
  context: string
): T {
  try {
    return validator(data);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new ValidationError(
        `Validation failed for ${context}: ${error.message}`
      );
    }
    throw new ValidationError(
      `Unexpected error validating ${context}: ${error}`
    );
  }
}
