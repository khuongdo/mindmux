/**
 * Status bar component with stats and hotkeys
 */

import React from 'react';
import { Box, Text } from 'ink';
import { QueueStats } from '../bridge/tui-bridge';
import { ViewType } from '../types';

interface StatusBarProps {
  stats: QueueStats;
  currentView: ViewType;
}

export function StatusBar({ stats, currentView }: StatusBarProps): React.ReactElement {
  return (
    <Box flexDirection="column" borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
      <Box paddingX={1}>
        <Text color="yellow">{stats.pending + stats.queued}</Text>
        <Text color="gray"> pending │ </Text>
        <Text color="green">{stats.running}</Text>
        <Text color="gray"> running │ </Text>
        <Text color="cyan">{stats.completed}</Text>
        <Text color="gray"> completed │ </Text>
        <Text color="red">{stats.failed}</Text>
        <Text color="gray"> failed</Text>
      </Box>
      <Box paddingX={1}>
        {currentView === 'agents' ? (
          <>
            <Text color="cyan">[n]</Text><Text>ew task </Text>
            <Text color="cyan">[a]</Text><Text>gent </Text>
            <Text color="cyan">[s]</Text><Text>tart </Text>
            <Text color="cyan">[x]</Text><Text>stop </Text>
            <Text color="cyan">[t]</Text><Text>mux </Text>
            <Text color="cyan">[Enter]</Text><Text> details </Text>
          </>
        ) : (
          <>
            <Text color="cyan">[n]</Text><Text>ew task </Text>
            <Text color="cyan">[c]</Text><Text>ancel </Text>
            <Text color="cyan">[Enter]</Text><Text> details </Text>
          </>
        )}
        <Text color="cyan">[Tab]</Text><Text> switch </Text>
        <Text color="cyan">[q]</Text><Text>uit</Text>
      </Box>
    </Box>
  );
}
