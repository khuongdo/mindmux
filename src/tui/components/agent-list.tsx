/**
 * Agent list view component
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { AgentWithSession } from '../bridge/tui-bridge';
import { AgentRow } from './agent-row';

interface AgentListProps {
  agents: AgentWithSession[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onEnter: (agentId: string) => void;
  onStart: (agentId: string) => void;
  onStop: (agentId: string) => void;
}

export function AgentList({
  agents,
  selectedIndex,
  onSelect,
  onEnter,
  onStart,
  onStop,
}: AgentListProps): React.ReactElement {
  useInput((input: string, key: any) => {
    if (key.upArrow && selectedIndex > 0) {
      onSelect(selectedIndex - 1);
    }
    if (key.downArrow && selectedIndex < agents.length - 1) {
      onSelect(selectedIndex + 1);
    }
    if (key.return && agents[selectedIndex]) {
      onEnter(agents[selectedIndex].id);
    }
    if (input === 's' && agents[selectedIndex]) {
      if (!agents[selectedIndex].isRunning) {
        onStart(agents[selectedIndex].id);
      }
    }
    if (input === 'x' && agents[selectedIndex]) {
      if (agents[selectedIndex].isRunning) {
        onStop(agents[selectedIndex].id);
      }
    }
  });

  if (agents.length === 0) {
    return (
      <Box paddingY={1}>
        <Text color="gray">No agents found. Press [a] to create one.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Agents</Text>
        <Text color="gray"> ({agents.length})</Text>
      </Box>
      {agents.map((agent, index) => (
        <AgentRow
          key={agent.id}
          agent={agent}
          isSelected={index === selectedIndex}
        />
      ))}
    </Box>
  );
}
