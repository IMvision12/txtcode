import chalk from 'chalk';
import gradient from 'gradient-string';

export function showBanner() {
  const sunsetGradient = gradient(['#FFFF00', '#FFD700', '#FFA500', '#FF6347']);
  
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
