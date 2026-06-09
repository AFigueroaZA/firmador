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
const pnpm = resolvePnpmCommand();
const webPort = (() => {
  try {
    const url = new URL(env.WEB_BASE_URL ?? 'http://localhost:4321');
    return url.port || (url.protocol === 'https:' ? '443' : '80');
  } catch {
    return '4321';
  }
})();

const services = [
  {
    name: 'api',
    color: '\x1b[34m',
    args: ['--filter', '@firmador/api', 'start:dev'],
  },
  {
    name: 'web',
    color: '\x1b[32m',
    args: [
      '--filter',
      '@firmador/web',
      'dev',
      '--',
      '--port',
      webPort,
      '--strictPort',
    ],
  },
];

const children = [];
let shuttingDown = false;

const prefixOutput = (service, stream, data) => {
  const reset = '\x1b[0m';
  const prefix = `${service.color}[${service.name}]${reset} `;
  String(data)
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach((line) => stream.write(`${prefix}${line}\n`));
};

for (const service of services) {
  const child = spawn(pnpm.executable, [...pnpm.baseArgs, ...service.args], {
    cwd: rootDir,
    env,
    shell: pnpm.shell,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (data) => prefixOutput(service, process.stdout, data));
  child.stderr.on('data', (data) => prefixOutput(service, process.stderr, data));
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    for (const runningChild of children) {
      if (runningChild !== child && !runningChild.killed) {
        runningChild.kill();
      }
    }

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  children.push(child);
}

const shutdown = () => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
