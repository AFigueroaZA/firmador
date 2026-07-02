import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createDevServices,
  parseEnv,
  resolvePnpmCommand,
  waitForTcpTarget,
} from './dev-processes.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, '..');
const envPath = resolve(rootDir, '.env');
const packageJsonPath = resolve(rootDir, 'package.json');
const packageManager = existsSync(packageJsonPath)
  ? JSON.parse(readFileSync(packageJsonPath, 'utf8')).packageManager
  : undefined;

const rootEnv = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
const env = {
  ...rootEnv,
  ...process.env,
};
const pnpm = resolvePnpmCommand({
  packageManager,
  npmExecPath: process.env.npm_execpath,
});
const services = createDevServices(env);

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

const spawnDevService = (service) => {
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
};

const startServices = async () => {
  for (const service of services) {
    if (service.waitFor) {
      prefixOutput(
        service,
        process.stdout,
        `Waiting for ${service.waitFor.description} before starting...`,
      );
      await waitForTcpTarget(service.waitFor);
    }

    if (!shuttingDown) {
      spawnDevService(service);
    }
  }
};

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

startServices().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  shutdown();
  process.exit(1);
});
