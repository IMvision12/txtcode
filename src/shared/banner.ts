import chalk from "chalk";

function centerText(text: string, width: number): string {
  // Remove ANSI color codes to calculate actual text length
  const plainText = text.replace(/\x1b\[[0-9;]*m/g, "");
  const padding = Math.max(0, Math.floor((width - plainText.length) / 2));
  return " ".repeat(padding) + text;
}

function getTerminalWidth(): number {
  return process.stdout.columns || 80; // Default to 80 if not available
}

export function showBanner() {
  const terminalWidth = getTerminalWidth();
  
  const logoLines = [
    "████████╗██╗  ██╗████████╗ ██████╗ ██████╗ ██████╗ ███████╗",
    "╚══██╔══╝╚██╗██╔╝╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝",
    "   ██║    ╚███╔╝    ██║   ██║     ██║   ██║██║  ██║█████╗  ",
    "   ██║    ██╔██╗    ██║   ██║     ██║   ██║██║  ██║██╔══╝  ",
    "   ██║   ██╔╝ ██╗   ██║   ╚██████╗╚██████╔╝██████╔╝███████╗",
    "   ╚═╝   ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝",
  ];
  
  const subtitle = "Remote coding via WhatsApp, Telegram, Discord & iMessage";

  console.log();
  logoLines.forEach(line => {
    console.log(centerText(chalk.white(line), terminalWidth));
  });
  console.log();
  console.log(centerText(chalk.gray(subtitle), terminalWidth));
  console.log();
}
