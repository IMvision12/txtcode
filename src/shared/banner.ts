import chalk from "chalk";

export function showBanner() {
  const banner = `
████████╗██╗  ██╗████████╗ ██████╗ ██████╗ ██████╗ ███████╗
╚══██╔══╝╚██╗██╔╝╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝
   ██║    ╚███╔╝    ██║   ██║     ██║   ██║██║  ██║█████╗  
   ██║    ██╔██╗    ██║   ██║     ██║   ██║██║  ██║██╔══╝  
   ██║   ██╔╝ ██╗   ██║   ╚██████╗╚██████╔╝██████╔╝███████╗
   ╚═╝   ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝`;

  console.log("");
  console.log(banner);
  console.log(chalk.cyan("  Remote coding via WhatsApp, Telegram & Discord\n"));
}
