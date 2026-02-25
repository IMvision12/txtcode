/**
 * Utility functions for centering text in the terminal
 */

export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

export function getTerminalHeight(): number {
  return process.stdout.rows || 24;
}

export function centerText(text: string, width?: number): string {
  const terminalWidth = width || getTerminalWidth();
  const plainText = text.replace(/\x1b\[[0-9;]*m/g, "");
  const padding = Math.max(0, Math.floor((terminalWidth - plainText.length) / 2));
  return " ".repeat(padding) + text;
}

export function centerLog(text: string): void {
  console.log(centerText(text));
}

export function calculateVerticalPadding(contentHeight: number): number {
  const terminalHeight = getTerminalHeight();
  return Math.max(0, Math.floor((terminalHeight - contentHeight) / 2));
}

/**
 * Calculate left padding for consistent left-aligned content
 * This creates a fixed-width content area that's centered in the terminal
 * @param contentWidth - The fixed width for content (default: 60)
 * @returns The number of spaces to pad from the left
 */
export function getLeftPadding(contentWidth: number = 60): number {
  const terminalWidth = getTerminalWidth();
  return Math.max(0, Math.floor((terminalWidth - contentWidth) / 2));
}

/**
 * Log text with consistent left alignment (for headings, messages, etc.)
 * @param text - The text to log
 * @param contentWidth - The fixed width for content (default: 60)
 */
export function leftAlignLog(text: string, contentWidth: number = 60): void {
  const padding = getLeftPadding(contentWidth);
  console.log(" ".repeat(padding) + text);
}
