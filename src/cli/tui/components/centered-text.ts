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
