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

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
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

const executableExists = (name) =>
  (process.env.PATH ?? '')
    .split(delimiter)
    .filter(Boolean)
    .some((entry) => existsSync(join(entry, name)));

const resolvePnpmCommand = () => {
  if (process.env.npm_execpath) {
    return {
      executable: process.execPath,
      baseArgs: [process.env.npm_execpath],
      shell: false,
    };
  }

  if (process.platform === 'win32') {
    if (executableExists('pnpm.cmd')) {
      return { executable: 'pnpm.cmd', baseArgs: [], shell: true };
    }

    return {
      executable: 'corepack.cmd',
      baseArgs: [packageManager ?? 'pnpm'],
      shell: true,
    };
  }

  return { executable: 'pnpm', baseArgs: [], shell: false };
};

const rootEnv = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
const env = {
  ...rootEnv,
  ...process.env,
};
const port = (() => {
  try {
    const url = new URL(env.WEB_BASE_URL ?? 'http://localhost:4321');
    return url.port || (url.protocol === 'https:' ? '443' : '80');
  } catch {
    return '4321';
  }
})();
const pnpm = resolvePnpmCommand();
const child = spawn(
  pnpm.executable,
  [
    ...pnpm.baseArgs,
    '--filter',
    '@firmador/web',
    'dev',
    '--',
    '--port',
    port,
    '--strictPort',
  ],
  {
    cwd: rootDir,
    env,
    shell: pnpm.shell,
    stdio: 'inherit',
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
