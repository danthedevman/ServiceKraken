import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicAddress, parseTarget, validateMonitor } from '../shared/validation/validation.js';
import { checkWebsite, resolvePublicTarget } from '../workers/src/monitoring/check.js';
import { hashPassword, verifyPassword } from '../api/src/auth/auth.js';
import { serializeMonitor } from '../api/src/domain/monitor.js';
import { ObjectId } from 'mongodb';
import { isAllowedOrigin } from '../api/src/middleware/origin.js';

test('allows only same-port loopback aliases and exact production origins', () => {
  const local = 'http://127.0.0.1:8090';
  for (const origin of [local, 'http://localhost:8090', 'http://[::1]:8090'])
    assert.equal(isAllowedOrigin(origin, local), true);
  for (const origin of [
    'http://localhost:8080',
    'https://localhost:8090',
    'http://localhost.evil.example:8090',
    'http://127.0.0.2:8090',
    'http://localhost:8090/path',
    'null',
    'https://evil.example',
  ])
    assert.equal(isAllowedOrigin(origin, local), false, origin);
  assert.equal(isAllowedOrigin('https://monitor.example.com', 'https://monitor.example.com'), true);
  assert.equal(isAllowedOrigin(local, 'https://monitor.example.com'), false);
});

test('reports missing, paused, and stale results without inventing current uptime', () => {
  const monitor = { _id: new ObjectId(), intervalMinutes: 1, paused: false, lastCheck: null };
  assert.equal(serializeMonitor(monitor).status, 'pending');
  monitor.lastCheck = { status: 'up', checkedAt: new Date(Date.now() - 180000) };
  assert.equal(serializeMonitor(monitor).status, 'unknown');
  monitor.paused = true;
  assert.equal(serializeMonitor(monitor).status, 'paused');
});

test('accepts public web URLs and enforces whole-minute intervals', () => {
  assert.equal(parseTarget('https://example.com/a#fragment').href, 'https://example.com/a');
  for (const intervalMinutes of [0, -1, 0.5, 1.5, 1441, '1', null]) {
    assert.throws(() =>
      validateMonitor({ name: 'Site', url: 'https://example.com', intervalMinutes }),
    );
  }
  for (const intervalMinutes of [1, 5, 1440])
    assert.equal(
      validateMonitor({ name: ' Site ', url: 'https://example.com', intervalMinutes }).name,
      'Site',
    );
});

test('rejects unsafe schemes, credentials, ports, and disguised private IPs', () => {
  for (const url of [
    'file:///etc/passwd',
    'ftp://example.com',
    'https://user:pass@example.com',
    'https://example.com:3000',
    'http://localhost',
    'http://localhost.',
    'http://a.internal',
    'http://127.1',
    'http://2130706433',
    'http://0x7f000001',
    'http://169.254.169.254',
    'http://10.0.0.1',
    'http://[::1]',
    'http://[::ffff:127.0.0.1]',
    'http://[2002:7f00:1::]',
  ]) {
    assert.throws(() => parseTarget(url), url);
  }
});

test('blocks non-public address ranges for both IP families', () => {
  for (const address of [
    '0.0.0.0',
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '192.0.2.1',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    'fe80::1',
    'fc00::1',
    'ff02::1',
    '2001:db8::1',
    '::ffff:8.8.8.8',
  ])
    assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress('93.184.215.14'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});

test('rejects DNS answers containing even one private IP', async () => {
  const url = new URL('https://example.com');
  await assert.rejects(
    resolvePublicTarget(url, async () => [
      { address: '93.184.215.14', family: 4 },
      { address: '10.0.0.1', family: 4 },
    ]),
  );
  assert.deepEqual(
    await resolvePublicTarget(url, async () => [{ address: '93.184.215.14', family: 4 }]),
    { address: '93.184.215.14', family: 4 },
  );
});

test('blocks private redirects before a second request', async () => {
  let calls = 0;
  const result = await checkWebsite('https://example.com', {
    followRedirects: true,
    fetchHeaders: async () => {
      calls++;
      return { statusCode: 302, location: 'http://127.0.0.1/admin' };
    },
  });
  assert.equal(result.status, 'down');
  assert.equal(calls, 1);
  assert.match(result.error, /Private/);
});

test('redirects default off and never request the destination for GET or HEAD', async () => {
  for (const method of ['GET', 'HEAD']) {
    let calls = 0;
    const result = await checkWebsite('https://example.com', {
      method,
      fetchHeaders: async () => {
        calls++;
        return { statusCode: 302, location: 'http://127.0.0.1/admin' };
      },
    });
    assert.equal(calls, 1);
    assert.equal(result.status, 'up');
    assert.equal(result.statusCode, 302);
    assert.equal(result.details.followRedirects, false);
    assert.equal(result.details.finalUrl, 'https://example.com/');
    assert.equal(result.details.responses[0].location, 'http://127.0.0.1/admin');
  }
});

test('redirect preference defaults off for legacy monitors and requires a boolean', () => {
  const input = { name: 'Site', url: 'https://example.com', intervalMinutes: 1 };
  assert.equal(validateMonitor(input).followRedirects, false);
  assert.equal(serializeMonitor({ ...input, _id: new ObjectId() }).followRedirects, false);
  assert.equal(validateMonitor({ ...input, followRedirects: true }).followRedirects, true);
  for (const followRedirects of ['true', 'false', 1, null, {}]) {
    assert.throws(() => validateMonitor({ ...input, followRedirects }));
  }
});

test('follows relative redirects, limits loops, and records HTTP failures', async () => {
  let calls = 0;
  const result = await checkWebsite('https://example.com', {
    followRedirects: true,
    fetchHeaders: async (url) =>
      ++calls === 1
        ? { statusCode: 301, location: '/new' }
        : (assert.equal(url.pathname, '/new'), { statusCode: 200 }),
  });
  assert.equal(result.status, 'up');
  const loop = await checkWebsite('https://example.com', {
    followRedirects: true,
    fetchHeaders: async () => ({ statusCode: 302, location: '/' }),
  });
  assert.match(loop.error, /Too many redirects/);
  const failure = await checkWebsite('https://example.com', {
    fetchHeaders: async () => ({ statusCode: 503 }),
  });
  assert.equal(failure.status, 'down');
  assert.equal(failure.error, 'HTTP 503');
});

test('times out and does not leak network errors', async () => {
  const timeout = await checkWebsite('https://example.com', {
    timeoutMs: 10,
    fetchHeaders: () => new Promise(() => {}),
  });
  assert.equal(timeout.status, 'down');
  assert.match(timeout.error, /timed out/);
  const failure = await checkWebsite('https://example.com', {
    fetchHeaders: async () => {
      throw new Error('sensitive internal data');
    },
  });
  assert.equal(failure.error, 'Connection, DNS, or TLS check failed.');
});

test('password hashes are salted and verify correctly', async () => {
  const password = 'A sufficiently long password';
  const first = await hashPassword(password);
  assert.notEqual(first, await hashPassword(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
});
