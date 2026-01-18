/**
 * Status indicator component
 */

import React from 'react';
import { Text } from 'ink';

interface StatusIndicatorProps {
  icon: string;
  color: string;
}

export function StatusIndicator({ icon, color }: StatusIndicatorProps): React.ReactElement {
  return <Text color={color}>{icon}</Text>;
}
