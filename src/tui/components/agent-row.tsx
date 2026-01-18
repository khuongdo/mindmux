/**
 * Single agent row component
 */

import React from 'react';
import { Box, Text } from 'ink';
import { AgentWithSession } from '../bridge/tui-bridge';
import { StatusIndicator } from './status-indicator';
import { getAgentStatusIcon } from '../utils/status-icons';
import { truncate, padEnd } from '../utils/format';

interface AgentRowProps {
  agent: AgentWithSession;
  isSelected: boolean;
  currentTask?: string;
}

export function AgentRow({ agent, isSelected, currentTask }: AgentRowProps): React.ReactElement {
  const statusInfo = getAgentStatusIcon(agent);

  return (
    <Box>
      <Text inverse={isSelected}> </Text>
      <StatusIndicator icon={statusInfo.icon} color={statusInfo.color} />
      <Text> </Text>
      <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
        {padEnd(agent.name, 15)}
      </Text>
      <Text color="gray">{padEnd(agent.type, 12)}</Text>
      <Text color={agent.status === 'busy' ? 'green' : 'gray'}>
        {agent.status === 'busy' && currentTask
          ? truncate(`Running: "${currentTask}"`, 40)
          : agent.status === 'idle' && agent.isRunning
          ? 'Waiting'
          : agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
      </Text>
    </Box>
  );
}
