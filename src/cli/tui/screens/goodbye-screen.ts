import chalk from "chalk";
import { renderBanner } from "../components/banner";
import { centerLog } from "../components/centered-text";

export function showGoodbyeScreen(): void {
  console.clear();

  console.log();
  renderBanner();
  console.log();
  console.log();
  centerLog(chalk.gray("Goodbye!"));
  console.log();
}
