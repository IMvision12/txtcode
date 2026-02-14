import chalk from 'chalk';

export function showBanner() {
  // Gradient effect: green -> yellow -> orange
  const line1 = chalk.green(' █████╗  ██████╗ ███████╗███╗   ██╗████████╗ ██████╗ ██████╗ ██████╗ ███████╗');
  const line2 = chalk.greenBright('██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝');
  const line3 = chalk.yellow('███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ██║     ██║   ██║██║  ██║█████╗  ');
  const line4 = chalk.yellow('██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ██║     ██║   ██║██║  ██║██╔══╝  ');
  const line5 = chalk.rgb(255, 165, 0)('██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ╚██████╗╚██████╔╝██████╔╝███████╗');
  const line6 = chalk.rgb(255, 140, 0)('╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝');

  console.log('');
  console.log(line1);
  console.log(line2);
  console.log(line3);
  console.log(line4);
  console.log(line5);
  console.log(line6);
  console.log(chalk.gray('  Remote IDE control via WhatsApp, Telegram & Discord\n'));
}
