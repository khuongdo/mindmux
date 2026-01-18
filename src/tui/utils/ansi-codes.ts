/**
 * ANSI escape codes for terminal control
 * ESM-compatible, no dependencies
 */

export const ANSI = {
  // Cursor control
  cursorUp: (n = 1) => `\x1b[${n}A`,
  cursorDown: (n = 1) => `\x1b[${n}B`,
  cursorForward: (n = 1) => `\x1b[${n}C`,
  cursorBack: (n = 1) => `\x1b[${n}D`,
  cursorTo: (x: number, y: number) => `\x1b[${y};${x}H`,
  cursorSave: '\x1b[s',
  cursorRestore: '\x1b[u',
  cursorHide: '\x1b[?25l',
  cursorShow: '\x1b[?25h',

  // Screen control
  clearScreen: '\x1b[2J',
  clearLine: '\x1b[2K',
  clearLineEnd: '\x1b[K',
  clearLineStart: '\x1b[1K',

  // Alternate screen
  enterAlternateScreen: '\x1b[?1049h',
  exitAlternateScreen: '\x1b[?1049l',

  // Mouse support
  enableMouse: '\x1b[?1000h',
  disableMouse: '\x1b[?1000l',
} as const;
