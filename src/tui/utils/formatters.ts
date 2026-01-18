/**
 * Text formatting utilities
 */

export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

export function padEnd(text: string, width: number, char = ' '): string {
  return text.padEnd(width, char);
}

export function padStart(text: string, width: number, char = ' '): string {
  return text.padStart(width, char);
}

export function center(text: string, width: number, char = ' '): string {
  const padding = Math.max(0, width - text.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return char.repeat(leftPad) + text + char.repeat(rightPad);
}

export function boxLine(
  text: string,
  width: number,
  left = '│',
  right = '│',
  pad = ' '
): string {
  const contentWidth = width - left.length - right.length;
  const paddedText = padEnd(text, contentWidth, pad);
  return `${left}${paddedText}${right}`;
}

export function boxTop(width: number, left = '┌', mid = '─', right = '┐'): string {
  return left + mid.repeat(width - 2) + right;
}

export function boxBottom(width: number, left = '└', mid = '─', right = '┘'): string {
  return left + mid.repeat(width - 2) + right;
}
