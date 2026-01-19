/**
 * Color scheme using raw ANSI codes
 * Zero dependencies
 */

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
} as const;

const color = (code: string) => (text: string) => `${code}${text}${ANSI.reset}`;

export const colors = {
  // Status colors
  success: color(ANSI.green),
  error: color(ANSI.red),
  warning: color(ANSI.yellow),
  info: color(ANSI.blue),

  // UI elements
  header: color(`${ANSI.bold}${ANSI.cyan}`),
  border: color(`${ANSI.dim}${ANSI.white}`),
  highlight: color(`${ANSI.bold}${ANSI.white}`),
  dim: color(`${ANSI.dim}${ANSI.white}`),

  // Agent status
  running: color(ANSI.green),
  waiting: color(ANSI.yellow),
  idle: color(`${ANSI.dim}${ANSI.white}`),
  failed: color(ANSI.red),
} as const;

export const STATUS_ICONS = {
  running: '●',
  waiting: '◐',
  idle: '○',
  error: '✕',
} as const;
