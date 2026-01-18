/**
 * Reusable modal wrapper component
 */

import React from 'react';
import { Box, Text } from 'ink';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
}

export function Modal({ title, children }: ModalProps): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      marginX={2}
    >
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">{title}</Text>
        <Text color="gray">[Esc] close</Text>
      </Box>
      {children}
    </Box>
  );
}
