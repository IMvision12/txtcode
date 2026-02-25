import chalk from "chalk";
import { centerText, getTerminalWidth } from "./centered-text";

const LOGO_LINES = [
  "████████╗██╗  ██╗████████╗ ██████╗ ██████╗ ██████╗ ███████╗",
  "╚══██╔══╝╚██╗██╔╝╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝",
  "   ██║    ╚███╔╝    ██║   ██║     ██║   ██║██║  ██║█████╗  ",
  "   ██║    ██╔██╗    ██║   ██║     ██║   ██║██║  ██║██╔══╝  ",
  "   ██║   ██╔╝ ██╗   ██║   ╚██████╗╚██████╔╝██████╔╝███████╗",
  "   ╚═╝   ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝",
];

const SUBTITLE = "Remote coding via WhatsApp, Telegram & Discord";

export function renderBanner(options?: { showSubtitle?: boolean }): void {
  const terminalWidth = getTerminalWidth();
  const showSubtitle = options?.showSubtitle !== false;

  LOGO_LINES.forEach((line) => {
    console.log(centerText(chalk.white(line), terminalWidth));
  });

  if (showSubtitle) {
    console.log();
    console.log(centerText(chalk.gray(SUBTITLE), terminalWidth));
  }
}

export function getBannerHeight(options?: { showSubtitle?: boolean }): number {
  const showSubtitle = options?.showSubtitle !== false;
  return LOGO_LINES.length + (showSubtitle ? 2 : 0); // +2 for spacing and subtitle
}
