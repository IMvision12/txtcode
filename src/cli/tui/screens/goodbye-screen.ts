import chalk from "chalk";
import { renderBanner } from "../components/banner";
import { centerLog, getTerminalWidth } from "../components/centered-text";

export function showGoodbyeScreen(): void {
  console.clear();

  const terminalWidth = getTerminalWidth();

  console.log();
  renderBanner();
  console.log();
  console.log();
  centerLog(chalk.gray("👋 Goodbye!"));
  console.log();
}
