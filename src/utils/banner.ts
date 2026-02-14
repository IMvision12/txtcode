import chalk from 'chalk';

export function showBanner() {
  // Rainbow gradient effect: cyan -> blue -> green -> yellow -> orange -> red
  const line1 = chalk.cyan(' █████╗ ') + chalk.blue(' ██████╗ ') + chalk.green('███████╗') + chalk.yellow('███╗   ██╗') + chalk.rgb(255, 165, 0)('████████╗') + chalk.rgb(255, 69, 0)(' ██████╗ ') + chalk.red('██████╗ ') + chalk.red('██████╗ ') + chalk.red('███████╗');
  const line2 = chalk.cyan('██╔══██╗') + chalk.blue('██╔════╝ ') + chalk.green('██╔════╝') + chalk.yellow('████╗  ██║') + chalk.rgb(255, 165, 0)('╚══██╔══╝') + chalk.rgb(255, 69, 0)('██╔════╝') + chalk.red('██╔═══██╗') + chalk.red('██╔══██╗') + chalk.red('██╔════╝');
  const line3 = chalk.cyan('███████║') + chalk.blue('██║  ███╗') + chalk.green('█████╗  ') + chalk.yellow('██╔██╗ ██║') + chalk.rgb(255, 165, 0)('   ██║   ') + chalk.rgb(255, 69, 0)('██║     ') + chalk.red('██║   ██║') + chalk.red('██║  ██║') + chalk.red('█████╗  ');
  const line4 = chalk.cyan('██╔══██║') + chalk.blue('██║   ██║') + chalk.green('██╔══╝  ') + chalk.yellow('██║╚██╗██║') + chalk.rgb(255, 165, 0)('   ██║   ') + chalk.rgb(255, 69, 0)('██║     ') + chalk.red('██║   ██║') + chalk.red('██║  ██║') + chalk.red('██╔══╝  ');
  const line5 = chalk.cyan('██║  ██║') + chalk.blue('╚██████╔╝') + chalk.green('███████╗') + chalk.yellow('██║ ╚████║') + chalk.rgb(255, 165, 0)('   ██║   ') + chalk.rgb(255, 69, 0)('╚██████╗') + chalk.red('╚██████╔╝') + chalk.red('██████╔╝') + chalk.red('███████╗');
  const line6 = chalk.cyan('╚═╝  ╚═╝') + chalk.blue(' ╚═════╝ ') + chalk.green('╚══════╝') + chalk.yellow('╚═╝  ╚═══╝') + chalk.rgb(255, 165, 0)('   ╚═╝   ') + chalk.rgb(255, 69, 0)(' ╚═════╝') + chalk.red(' ╚═════╝ ') + chalk.red('╚═════╝ ') + chalk.red('╚══════╝');

  console.log('');
  console.log(line1);
  console.log(line2);
  console.log(line3);
  console.log(line4);
  console.log(line5);
  console.log(line6);
  console.log(chalk.gray('  Remote IDE control via WhatsApp, Telegram & Discord\n'));
}
