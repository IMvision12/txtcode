import chalk from "chalk";

export function showHelpScreen(): void {
  console.clear();

  console.log();
  console.log(chalk.bold.cyan("  Platform Commands"));
  console.log(chalk.gray("  ─────────────────────────────────────────────────"));
  console.log();

  const commands = [
    { cmd: "/code", desc: "Switch to CODE mode — messages go to the coding adapter" },
    { cmd: "/chat", desc: "Switch to CHAT mode — messages go to the primary LLM" },
    { cmd: "/cancel", desc: "Cancel the currently running command" },
    { cmd: "/switch", desc: "Switch Primary LLM or Coding Adapter" },
    { cmd: "/cli-model", desc: "Change the model used by the current coding adapter" },
    { cmd: "/status", desc: "Check adapter connection and current configuration" },
    { cmd: "/help", desc: "Show the help message with all commands" },
  ];

  const maxCmdLen = Math.max(...commands.map((c) => c.cmd.length));

  for (const { cmd, desc } of commands) {
    const padded = cmd.padEnd(maxCmdLen + 2);
    console.log(`  ${chalk.green(padded)}${chalk.white(desc)}`);
  }

  console.log();
  console.log(chalk.gray("  ─────────────────────────────────────────────────"));
  console.log();

  console.log(chalk.bold("  Modes"));
  console.log();
  console.log(`  ${chalk.yellow("Chat")}  ${chalk.gray("(default)")}  Messages are processed by the primary LLM`);
  console.log(`  ${chalk.yellow("Code")}  ${chalk.gray("(/code)")}    Messages are sent directly to the coding CLI`);
  console.log();

  console.log(chalk.bold("  Tips"));
  console.log();
  console.log(
    chalk.gray("  • In code mode, sending a new message auto-cancels the previous one"),
  );
  console.log(
    chalk.gray("  • Use /cli-model to switch between models without restarting"),
  );
  console.log(
    chalk.gray("  • Use /switch to change both the LLM provider and coding adapter"),
  );
  console.log();
}
