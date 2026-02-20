import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { LOG_DIR } from '../../shared/logger';

interface LogsOptions {
  follow?: boolean;
  all?: boolean;
  lines?: string;
  clear?: boolean;
}

function getSessionFiles(): { name: string; fullPath: string; mtime: Date; size: number }[] {
  if (!fs.existsSync(LOG_DIR)) return [];

  const files = fs.readdirSync(LOG_DIR)
    .filter((f) => f.startsWith('session-') && f.endsWith('.log'));

  return files
    .map((name) => {
      const fullPath = path.join(LOG_DIR, name);
      const stat = fs.statSync(fullPath);
      return { name, fullPath, mtime: stat.mtime, size: stat.size };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseSessionTimestamp(name: string): string {
  const match = name.match(/^session-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})\.log$/);
  if (!match) return name;
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
}

export function logsCommand(session: string | undefined, options: LogsOptions) {
  if (options.clear) {
    const sessions = getSessionFiles();
    if (sessions.length === 0) {
      console.log(chalk.yellow('\nNo log files to clear.\n'));
      return;
    }
    for (const s of sessions) {
      fs.unlinkSync(s.fullPath);
    }
    console.log(chalk.green(`\nDeleted ${sessions.length} session log(s).\n`));
    return;
  }

  const sessions = getSessionFiles();

  if (sessions.length === 0) {
    console.log(chalk.yellow('\nNo session logs found. Logs are created when the agent starts.\n'));
    console.log(chalk.gray(`Expected location: ${LOG_DIR}`));
    return;
  }

  if (options.follow) {
    const latest = sessions[0];
    console.log(chalk.cyan(`\nFollowing ${latest.name} (Ctrl+C to stop)\n`));

    const content = fs.readFileSync(latest.fullPath, 'utf-8');
    const lines = content.split('\n');
    const tail = lines.slice(-20);
    for (const line of tail) {
      if (line.trim()) printColoredLine(line);
    }

    let position = fs.statSync(latest.fullPath).size;

    const watcher = setInterval(() => {
      try {
        const stat = fs.statSync(latest.fullPath);
        if (stat.size > position) {
          const fd = fs.openSync(latest.fullPath, 'r');
          const buffer = Buffer.alloc(stat.size - position);
          fs.readSync(fd, buffer, 0, buffer.length, position);
          fs.closeSync(fd);
          position = stat.size;

          const newLines = buffer.toString('utf-8').split('\n');
          for (const line of newLines) {
            if (line.trim()) printColoredLine(line);
          }
        } else if (stat.size < position) {
          position = 0;
        }
      } catch {
        position = 0;
      }
    }, 500);

    process.on('SIGINT', () => {
      clearInterval(watcher);
      process.exit(0);
    });

    return;
  }

  if (!session) {
    console.log(chalk.cyan(`\nSession logs (${LOG_DIR}):\n`));

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      const ts = parseSessionTimestamp(s.name);
      const sizeStr = formatSize(s.size);
      const label = i === 0 ? chalk.green('  <- latest') : '';
      console.log(`  ${chalk.white(`[${i + 1}]`)} ${ts}  ${chalk.gray(`(${sizeStr})`)}${label}`);
    }

    console.log('');
    console.log(chalk.gray('  txtcode logs <number>   View a session'));
    console.log(chalk.gray('  txtcode logs -f         Follow the latest session'));
    console.log(chalk.gray('  txtcode logs --clear    Delete all logs'));
    console.log('');
    return;
  }

  const idx = parseInt(session, 10);
  if (isNaN(idx) || idx < 1 || idx > sessions.length) {
    console.log(chalk.red(`\nInvalid session number: ${session}. Must be 1-${sessions.length}.\n`));
    return;
  }

  const selected = sessions[idx - 1];
  const content = fs.readFileSync(selected.fullPath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());

  if (options.all) {
    console.log(chalk.cyan(`\nFull log: ${selected.name} (${formatSize(selected.size)})\n`));
    for (const line of lines) {
      printColoredLine(line);
    }
  } else {
    const count = parseInt(options.lines || '50', 10);
    const tail = lines.slice(-count);
    console.log(chalk.cyan(`\nLast ${tail.length} lines from ${selected.name}\n`));
    for (const line of tail) {
      printColoredLine(line);
    }
  }
}

function printColoredLine(line: string): void {
  if (line.includes('[ERROR]')) {
    console.log(chalk.red(line));
  } else if (line.includes('[DEBUG]')) {
    console.log(chalk.gray(line));
  } else if (line.includes('[INFO]')) {
    console.log(chalk.cyan(line));
  } else {
    console.log(line);
  }
}
