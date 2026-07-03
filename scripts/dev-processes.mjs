import { existsSync } from 'node:fs';
import { connect } from 'node:net';
import { delimiter, join } from 'node:path';

export const parseEnv = (source) => {
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

export const getTcpTargetFromUrl = (value, fallback = 'http://localhost:3000') => {
  const url = new URL(value ?? fallback);
  const defaultPort = url.protocol === 'https:' ? 443 : 80;
  const port = Number.parseInt(url.port || String(defaultPort), 10);
  return {
    host: url.hostname.replace(/^\[(.*)\]$/, '$1'),
    port,
  };
};

export const getPortFromUrl = (value, fallback = 'http://localhost:4321') => {
  const { port } = getTcpTargetFromUrl(value, fallback);
  return String(port);
};

const getPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const executableExists = (name) =>
  (process.env.PATH ?? '')
    .split(delimiter)
    .filter(Boolean)
    .some((entry) => existsSync(join(entry, name)));

export const resolvePnpmCommand = ({ packageManager, npmExecPath } = {}) => {
  if (npmExecPath) {
    return {
      executable: process.execPath,
      baseArgs: [npmExecPath],
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

export const createDevServices = (env) => {
  const webPort = getPortFromUrl(env.WEB_BASE_URL);
  const apiTarget = getTcpTargetFromUrl(env.API_BASE_URL);
  const apiReadyTimeoutMs = getPositiveInteger(
    env.API_READY_TIMEOUT_MS,
    120_000,
  );

  return [
    {
      name: 'api',
      color: '\x1b[34m',
      args: ['--filter', '@firmador/api', 'start:dev'],
    },
    {
      name: 'web',
      color: '\x1b[32m',
      waitFor: {
        description: `api at ${apiTarget.host}:${apiTarget.port}`,
        timeoutMs: apiReadyTimeoutMs,
        ...apiTarget,
      },
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
};

const canConnect = ({ host, port }) =>
  new Promise((resolve) => {
    const socket = connect({ host, port });
    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });

export const waitForTcpTarget = async (
  target,
  { timeoutMs = target.timeoutMs ?? 120_000, intervalMs = 250 } = {},
) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await canConnect(target)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${target.description}`);
};
