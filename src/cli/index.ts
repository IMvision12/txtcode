#!/usr/bin/env node
import chalk from "chalk";
import { interactiveMode } from "./commands/interactive";

interactiveMode().catch((error) => {
  console.error(chalk.red("Interactive mode failed:"), error);
  process.exit(1);
});
