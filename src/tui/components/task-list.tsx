/**
 * Task list view component
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Task } from '../../core/types';
import { TaskRow } from './task-row';
import { AgentWithSession } from '../bridge/tui-bridge';
import { padEnd } from '../utils/format';

interface TaskListProps {
  tasks: Task[];
  agents: AgentWithSession[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onEnter: (taskId: string) => void;
  onCancel: (taskId: string) => void;
}

export function TaskList({
  tasks,
  agents,
  selectedIndex,
  onSelect,
  onEnter,
  onCancel,
}: TaskListProps): React.ReactElement {
  const agentMap = new Map(agents.map(a => [a.id, a.name]));

  useInput((input: string, key: any) => {
    if (key.upArrow && selectedIndex > 0) {
      onSelect(selectedIndex - 1);
    }
    if (key.downArrow && selectedIndex < tasks.length - 1) {
      onSelect(selectedIndex + 1);
    }
    if (key.return && tasks[selectedIndex]) {
      onEnter(tasks[selectedIndex].id);
    }
    if (input === 'c' && tasks[selectedIndex]) {
      const task = tasks[selectedIndex];
      if (task.status === 'pending' || task.status === 'queued') {
        onCancel(task.id);
      }
    }
  });

  if (tasks.length === 0) {
    return (
      <Box paddingY={1}>
        <Text color="gray">No tasks found. Press [n] to create one.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Tasks</Text>
        <Text color="gray"> ({tasks.length})</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">
          {padEnd('ID', 10)}
          {'  '}
          {padEnd('Status', 12)}
          {padEnd('Agent', 15)}
          Prompt
        </Text>
      </Box>
      {tasks.map((task, index) => (
        <TaskRow
          key={task.id}
          task={task}
          isSelected={index === selectedIndex}
          agentName={task.agentId ? agentMap.get(task.agentId) : undefined}
        />
      ))}
    </Box>
  );
}
