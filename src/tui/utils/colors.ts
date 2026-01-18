/**
 * Color scheme using ansis
 * ESM-compatible ANSI color library
 */

import ansis from 'ansis';

export const colors = {
  // Status colors
  success: ansis.green,
  error: ansis.red,
  warning: ansis.yellow,
  info: ansis.blue,

  // UI elements
  header: ansis.bold.cyan,
  border: ansis.dim.white,
  highlight: ansis.bold.white,
  dim: ansis.dim.white,

  // Agent status
  running: ansis.green,
  waiting: ansis.yellow,
  idle: ansis.dim.white,
  failed: ansis.red,
} as const;

export const STATUS_ICONS = {
  running: '●',
  waiting: '◐',
  idle: '○',
  error: '✕',
} as const;
