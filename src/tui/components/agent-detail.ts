/**
 * Agent detail view component
 */

import { Agent } from '../../core/types.js';
import { colors, STATUS_ICONS } from '../utils/colors.js';
import { boxTop, boxBottom, boxLine, center } from '../utils/formatters.js';

export function renderAgentDetail(agent: Agent, width: number): string[] {
  const lines: string[] = [];

  // Title
  lines.push('');
  lines.push(colors.header(center(`Agent: ${agent.name}`, width)));
  lines.push(colors.dim('─'.repeat(width)));
  lines.push('');

  // Status
  const statusIcon = agent.isRunning ? STATUS_ICONS.running : STATUS_ICONS.idle;
  const statusColor = agent.isRunning ? colors.running : colors.idle;
  const statusText = agent.isRunning ? 'Running' : agent.status;

  lines.push(`  ${statusColor(statusIcon)} Status: ${statusColor(statusText)}`);
  lines.push('');

  // Basic Info
  lines.push(colors.dim('  Basic Information:'));
  lines.push(`    ID:           ${agent.id.substring(0, 8)}...`);
  lines.push(`    Type:         ${agent.type}`);
  lines.push(`    Created:      ${new Date(agent.createdAt).toLocaleString()}`);

  if (agent.lastActivity) {
    lines.push(`    Last Active:  ${new Date(agent.lastActivity).toLocaleString()}`);
  }

  lines.push('');

  // Capabilities
  lines.push(colors.dim('  Capabilities:'));
  if (agent.capabilities.length > 0) {
    agent.capabilities.forEach(cap => {
      lines.push(`    • ${cap}`);
    });
  } else {
    lines.push(colors.dim('    (none)'));
  }

  lines.push('');

  // Session Info
  if (agent.sessionName) {
    lines.push(colors.dim('  Session:'));
    lines.push(`    Tmux:         ${agent.sessionName}`);
    if (agent.pid) {
      lines.push(`    PID:          ${agent.pid}`);
    }
    lines.push('');
  }

  // Config
  lines.push(colors.dim('  Configuration:'));
  lines.push(`    Model:        ${agent.config.model || 'default'}`);
  if (agent.config.maxConcurrentTasks) {
    lines.push(`    Max Tasks:    ${agent.config.maxConcurrentTasks}`);
  }
  if (agent.config.timeout) {
    lines.push(`    Timeout:      ${agent.config.timeout}ms`);
  }
  lines.push('');

  // Footer
  lines.push(colors.dim('─'.repeat(width)));
  lines.push(colors.dim(center('Press any key to return', width)));
  lines.push('');

  return lines;
}
