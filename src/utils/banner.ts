import chalk from 'chalk';

export function showBanner() {
  // Gradient effect: cyan -> blue -> magenta
  const line1 = chalk.cyan(' ██████╗ ██████╗ ███████╗███╗   ██╗ ██████╗ ██████╗ ██████╗ ███████╗');
  const line2 = chalk.cyan('██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██╔═══██╗██╔══██╗██╔════╝');
  const line3 = chalk.blue('██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║     ██║   ██║██║  ██║█████╗  ');
  const line4 = chalk.blue('██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║     ██║   ██║██║  ██║██╔══╝  ');
  const line5 = chalk.magenta('╚██████╔╝██║     ███████╗██║ ╚████║╚██████╗╚██████╔╝██████╔╝███████╗');
  const line6 = chalk.magenta(' ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝');

  console.log('');
  console.log(line1);
  console.log(line2);
  console.log(line3);
  console.log(line4);
  console.log(line5);
  console.log(line6);
  console.log(chalk.gray('  Remote IDE control via WhatsApp, Telegram & Discord\n'));
}
