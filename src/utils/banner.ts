import chalk from 'chalk';
import gradient from 'gradient-string';

export function showBanner() {
  // Create a cyan to blue gradient (Sunset Tech style)
  const sunsetGradient = gradient(['#00D9FF', '#0099FF', '#0066FF', '#0033FF']);
  
  const banner = `
████████╗██╗  ██╗████████╗ ██████╗ ██████╗ ██████╗ ███████╗
╚══██╔══╝╚██╗██╔╝╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝
   ██║    ╚███╔╝    ██║   ██║     ██║   ██║██║  ██║█████╗  
   ██║    ██╔██╗    ██║   ██║     ██║   ██║██║  ██║██╔══╝  
   ██║   ██╔╝ ██╗   ██║   ╚██████╗╚██████╔╝██████╔╝███████╗
   ╚═╝   ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝`;

  console.log('');
  console.log(sunsetGradient.multiline(banner));
  console.log(chalk.cyan('  Remote coding via WhatsApp, Telegram & Discord\n'));
}
