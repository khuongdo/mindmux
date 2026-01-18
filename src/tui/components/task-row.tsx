/**
 * Single task row component
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Task } from '../../core/types';
import { StatusIndicator } from './status-indicator';
import { getTaskStatusIcon } from '../utils/status-icons';
import { truncate, padEnd, formatTaskId } from '../utils/format';

interface TaskRowProps {
  task: Task;
  isSelected: boolean;
  agentName?: string;
}

export function TaskRow({ task, isSelected, agentName }: TaskRowProps): React.ReactElement {
  const statusInfo = getTaskStatusIcon(task.status);

  return (
    <Box>
      <Text inverse={isSelected}> </Text>
      <Text color="gray">{formatTaskId(task.id)} </Text>
      <StatusIndicator icon={statusInfo.icon} color={statusInfo.color} />
      <Text> </Text>
      <Text color={isSelected ? 'cyan' : undefined}>
        {padEnd(task.status, 12)}
      </Text>
      <Text color="gray">{padEnd(agentName || '-', 15)}</Text>
      <Text>{truncate(task.prompt, 35)}</Text>
    </Box>
  );
}
