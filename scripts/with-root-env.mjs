import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, '..');
const envPath = resolve(rootDir, '.env');
const packageJsonPath = resolve(rootDir, 'package.json');
const packageManager = existsSync(packageJsonPath)
  ? JSON.parse(readFileSync(packageJsonPath, 'utf8')).packageManager
  : undefined;

const parseEnv = (source) => {
  const values = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    let value = normalized.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }

    const quote = value[0];
    if (
      (quote === '"' || quote === "'") &&
      value.endsWith(quote) &&
      value.length >= 2
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
};

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: node scripts/with-root-env.mjs <command> [...args]');
  process.exit(1);
}

const executableExists = (name) =>
  (process.env.PATH ?? '')
    .split(delimiter)
    .filter(Boolean)
    .some((entry) => existsSync(join(entry, name)));

let executable = command;
let executableArgs = args;

if (command === 'pnpm' && process.env.npm_execpath) {
  executable = process.execPath;
  executableArgs = [process.env.npm_execpath, ...args];
} else if (process.platform === 'win32') {
  if (command === 'pnpm') {
    if (executableExists('pnpm.cmd')) {
      executable = 'pnpm.cmd';
    } else {
      executable = 'corepack.cmd';
      executableArgs = [packageManager ?? 'pnpm', ...args];
    }
  }
}

const rootEnv = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
const child = spawn(executable, executableArgs, {
  cwd: rootDir,
  env: {
    ...rootEnv,
    ...process.env,
  },
  shell: process.platform === 'win32' && executable.endsWith('.cmd'),
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
