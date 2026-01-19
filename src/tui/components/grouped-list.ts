/**
 * Grouped agent list component
 * Phase 5.5: Hierarchical organization
 */

import { Agent } from '../../core/types.js';
import { colors, STATUS_ICONS } from '../utils/colors.js';
import { truncate, padEnd } from '../utils/formatters.js';

export interface GroupedListOptions {
  width: number;
  selectedIndex?: number;
  groupBy: 'type' | 'capability' | 'status';
}

interface AgentGroup {
  name: string;
  agents: Agent[];
  collapsed: boolean;
}

/**
 * Group agents by specified criteria
 */
function groupAgents(agents: Agent[], groupBy: string): AgentGroup[] {
  const groups: Map<string, Agent[]> = new Map();

  agents.forEach(agent => {
    let groupKey: string;

    if (groupBy === 'type') {
      groupKey = agent.type;
    } else if (groupBy === 'capability') {
      groupKey = agent.capabilities.length > 0 ? agent.capabilities[0] : 'No Capabilities';
    } else if (groupBy === 'status') {
      groupKey = agent.isRunning ? 'Running' : agent.status;
    } else {
      groupKey = 'All Agents';
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(agent);
  });

  return Array.from(groups.entries()).map(([name, agents]) => ({
    name,
    agents,
    collapsed: false,
  }));
}

/**
 * Render grouped agent list
 */
export function renderGroupedList(
  agents: Agent[],
  options: GroupedListOptions
): string[] {
  const lines: string[] = [];
  const { width, selectedIndex = -1, groupBy } = options;

  if (agents.length === 0) {
    lines.push('');
    lines.push(colors.dim('  No agents found. Create one with: mux agent:create'));
    lines.push('');
    return lines;
  }

  const groups = groupAgents(agents, groupBy);

  // Header
  lines.push('');
  lines.push(colors.dim(`  Grouped by: ${groupBy}`));
  lines.push(colors.dim('  ' + '─'.repeat(width - 4)));

  let globalIndex = 0;

  groups.forEach(group => {
    // Group header
    const groupHeader = `  ▼ ${group.name} (${group.agents.length})`;
    lines.push(colors.header(groupHeader));

    // Group agents
    if (!group.collapsed) {
      group.agents.forEach(agent => {
        const isSelected = globalIndex === selectedIndex;
        const line = renderAgentRow(agent, isSelected);
        lines.push('    ' + line);
        globalIndex++;
      });
    } else {
      globalIndex += group.agents.length;
    }

    lines.push('');
  });

  // Summary
  const summary = `Total: ${agents.length} agents in ${groups.length} groups`;
  lines.push(colors.dim(`  ${summary}`));
  lines.push('');

  return lines;
}

/**
 * Render single agent row
 */
function renderAgentRow(agent: Agent, isSelected: boolean): string {
  const statusIcon = agent.isRunning ? STATUS_ICONS.running :
                     agent.status === 'busy' ? STATUS_ICONS.waiting :
                     agent.status === 'error' ? STATUS_ICONS.error :
                     STATUS_ICONS.idle;

  const statusColor = agent.isRunning ? colors.running :
                      agent.status === 'busy' ? colors.waiting :
                      agent.status === 'error' ? colors.failed :
                      colors.idle;

  const name = truncate(agent.name, 18);
  const status = agent.isRunning ? 'running' :
                 agent.status === 'busy' ? 'busy' :
                 agent.status === 'error' ? 'error' :
                 'idle';

  const parts = [
    statusColor(statusIcon),
    ' ',
    padEnd(name, 18),
    ' ',
    statusColor(padEnd(status, 10)),
  ];

  let line = parts.join('');

  if (isSelected) {
    line = colors.highlight(line);
  }

  return line;
}
