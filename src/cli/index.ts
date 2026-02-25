#!/usr/bin/env node
import chalk from "chalk";
import { interactiveMode } from "./commands/interactive";

// Always launch interactive TUI mode
interactiveMode().catch((error) => {
  console.error(chalk.red("Interactive mode failed:"), error);
  process.exit(1);
});

