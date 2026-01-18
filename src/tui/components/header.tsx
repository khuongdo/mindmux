/**
 * TUI Header component
 */

import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  runningCount: number;
}

export function Header({ runningCount }: HeaderProps): React.ReactElement {
  return (
    <Box
      borderStyle="single"
      borderTop
      borderLeft
      borderRight
      borderBottom={false}
      paddingX={1}
    >
      <Box flexGrow={1}>
        <Text bold>MindMux - Multi-Agent Orchestration</Text>
      </Box>
      <Box>
        <Text color="green">● </Text>
        <Text>{runningCount}</Text>
        <Text color="gray"> running</Text>
      </Box>
    </Box>
  );
}
