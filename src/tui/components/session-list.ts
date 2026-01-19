/**
 * Session list component for displaying agents
 */

import { Agent, AgentStatus } from '../../core/types.js';
import { colors, STATUS_ICONS } from '../utils/colors.js';
import { truncate, padEnd } from '../utils/formatters.js';

export interface SessionListOptions {
  width: number;
  selectedIndex?: number;
}

/**
 * Render session list
 */
export function renderSessionList(
  agents: Agent[],
  options: SessionListOptions
): string[] {
  const lines: string[] = [];
  const { width, selectedIndex = -1 } = options;

  if (agents.length === 0) {
    lines.push('');
    lines.push(colors.dim('  No agents found. Create one with: mux agent:create'));
    lines.push('');
    return lines;
  }

  // Header
  lines.push('');
  lines.push(colors.dim('  NAME                TYPE         STATUS       CAPABILITIES'));
  lines.push(colors.dim('  ' + '─'.repeat(width - 4)));

  // Agent rows
  agents.forEach((agent, index) => {
    const isSelected = index === selectedIndex;
    const line = renderAgentRow(agent, isSelected);
    lines.push(line);
  });

  lines.push('');

  // Summary
  const summary = generateSummary(agents);
  lines.push(colors.dim(`  ${summary}`));
  lines.push('');

  return lines;
}

/**
 * Render single agent row
 */
function renderAgentRow(agent: Agent, isSelected: boolean): string {
  const statusIcon = getStatusIcon(agent.status, agent.isRunning);
  const statusColor = getStatusColor(agent.status, agent.isRunning);

  const name = truncate(agent.name, 18);
  const type = truncate(agent.type, 10);
  const status = getDisplayStatus(agent.status, agent.isRunning);
  const capabilities = truncate(agent.capabilities.join(', '), 30);

  const parts = [
    '  ',
    statusColor(statusIcon),
    ' ',
    padEnd(name, 18),
    ' ',
    padEnd(type, 10),
    ' ',
    statusColor(padEnd(status, 10)),
    ' ',
    colors.dim(capabilities),
  ];

  let line = parts.join('');

  // Highlight selected row
  if (isSelected) {
    line = colors.highlight(line);
  }

  return line;
}

/**
 * Get display status text
 */
function getDisplayStatus(status: AgentStatus, isRunning?: boolean): string {
  if (isRunning) return 'running';
  if (status === 'busy') return 'busy';
  if (status === 'error') return 'error';
  return 'idle';
}

/**
 * Get status icon
 */
function getStatusIcon(status: AgentStatus, isRunning?: boolean): string {
  if (isRunning) return STATUS_ICONS.running;
  if (status === 'busy') return STATUS_ICONS.waiting;
  if (status === 'error') return STATUS_ICONS.error;
  return STATUS_ICONS.idle;
}

/**
 * Get status color
 */
function getStatusColor(status: AgentStatus, isRunning?: boolean) {
  if (isRunning) return colors.running;
  if (status === 'busy') return colors.waiting;
  if (status === 'error') return colors.failed;
  return colors.idle;
}

/**
 * Generate summary line
 */
function generateSummary(agents: Agent[]): string {
  const counts = {
    running: agents.filter(a => a.isRunning).length,
    busy: agents.filter(a => a.status === 'busy').length,
    idle: agents.filter(a => a.status === 'idle' && !a.isRunning).length,
    error: agents.filter(a => a.status === 'error').length,
  };

  const parts: string[] = [];

  if (counts.running > 0) {
    parts.push(`${counts.running} running`);
  }
  if (counts.busy > 0) {
    parts.push(`${counts.busy} busy`);
  }
  if (counts.idle > 0) {
    parts.push(`${counts.idle} idle`);
  }
  if (counts.error > 0) {
    parts.push(`${counts.error} error`);
  }

  const summary = parts.join(' | ');
  return `Total: ${agents.length} agents${summary ? ' | ' + summary : ''}`;
}
