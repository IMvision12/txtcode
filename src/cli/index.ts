#!/usr/bin/env node
// Suppress deprecation warnings from dependencies (e.g. punycode, Buffer)
// before any imports that might trigger them
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.name === "DeprecationWarning") {
    return;
  }
  console.warn(warning);
});

import chalk from "chalk";
import { interactiveMode } from "./commands/interactive";

interactiveMode().catch((error) => {
  console.error(chalk.red("Interactive mode failed:"), error);
  process.exit(1);
});
