import chalk from 'chalk';
import gradient from 'gradient-string';

export function showBanner() {
  // Create a rainbow gradient from cyan to yellow/orange
  const rainbowGradient = gradient(['cyan', 'blue', 'magenta', 'red', 'orange', 'yellow']);
  
  const banner = `
 █████╗  ██████╗ ███████╗███╗   ██╗████████╗ ██████╗ ██████╗ ██████╗ ███████╗
██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝
███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ██║     ██║   ██║██║  ██║█████╗  
██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ██║     ██║   ██║██║  ██║██╔══╝  
██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ╚██████╗╚██████╔╝██████╔╝███████╗
╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝`;

  console.log('');
  console.log(rainbowGradient.multiline(banner));
  console.log(chalk.gray('  Remote IDE control via WhatsApp, Telegram & Discord\n'));
}
