import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createDevServices,
  getTcpTargetFromUrl,
  parseEnv,
} from './dev-processes.mjs';

test('parseEnv reads exported and quoted values', () => {
  assert.deepEqual(
    parseEnv(`
      # ignored
      export API_BASE_URL="http://localhost:3000"
      WEB_BASE_URL='http://localhost:4321'
    `),
    {
      API_BASE_URL: 'http://localhost:3000',
      WEB_BASE_URL: 'http://localhost:4321',
    },
  );
});

test('getTcpTargetFromUrl resolves explicit and default ports', () => {
  assert.deepEqual(getTcpTargetFromUrl('http://localhost:3000'), {
    host: 'localhost',
    port: 3000,
  });
  assert.deepEqual(getTcpTargetFromUrl('https://example.test'), {
    host: 'example.test',
    port: 443,
  });
});

test('createDevServices starts web only after the API port is accepting connections', () => {
  const services = createDevServices({
    API_BASE_URL: 'http://localhost:3000',
    WEB_BASE_URL: 'http://localhost:4321',
  });

  assert.equal(services[0].name, 'api');
  assert.equal(services[1].name, 'web');
  assert.deepEqual(services[1].waitFor, {
    description: 'api at localhost:3000',
    host: 'localhost',
    port: 3000,
    timeoutMs: 120_000,
  });
});

test('createDevServices allows overriding the API readiness timeout', () => {
  const services = createDevServices({
    API_BASE_URL: 'http://localhost:3000',
    API_READY_TIMEOUT_MS: '45000',
  });

  assert.equal(services[1].waitFor.timeoutMs, 45_000);
});
