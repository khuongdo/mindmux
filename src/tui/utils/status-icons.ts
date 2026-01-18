/**
 * Status icon mappings for TUI display
 */

import { AgentStatus, TaskStatus } from '../../core/types';

export const AGENT_STATUS_ICONS: Record<AgentStatus | 'running', { icon: string; color: string }> = {
  idle: { icon: '○', color: 'gray' },
  busy: { icon: '●', color: 'green' },
  unhealthy: { icon: '✕', color: 'red' },
  running: { icon: '●', color: 'green' },  // alias for busy
};

export const TASK_STATUS_ICONS: Record<TaskStatus, { icon: string; color: string }> = {
  pending: { icon: '◌', color: 'gray' },
  queued: { icon: '◐', color: 'yellow' },
  assigned: { icon: '◑', color: 'cyan' },
  running: { icon: '●', color: 'green' },
  completed: { icon: '✓', color: 'green' },
  failed: { icon: '✕', color: 'red' },
  cancelled: { icon: '○', color: 'gray' },
};

export function getAgentStatusIcon(agent: { status: AgentStatus; isRunning?: boolean }): { icon: string; color: string } {
  if (agent.isRunning && agent.status === 'busy') {
    return AGENT_STATUS_ICONS.busy;
  }
  if (agent.isRunning && agent.status === 'idle') {
    return { icon: '◐', color: 'yellow' };  // waiting
  }
  return AGENT_STATUS_ICONS[agent.status] || AGENT_STATUS_ICONS.idle;
}

export function getTaskStatusIcon(status: TaskStatus): { icon: string; color: string } {
  return TASK_STATUS_ICONS[status] || TASK_STATUS_ICONS.pending;
}
