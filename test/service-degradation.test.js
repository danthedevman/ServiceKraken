import test from 'node:test';
import assert from 'node:assert/strict';
import {
  healthPolicy,
  monitorHealth,
  serviceHealth,
  rollupHealth,
} from '../shared/domain/service-health.js';
import { updateText, publicSnapshot } from '../shared/status/updates.js';

const now = Date.now();
const monitor = (status, durationMs = 100, consecutiveFailures = 0) => ({
  serviceId: 'a',
  intervalMinutes: 1,
  paused: false,
  lastCheck: { status, durationMs, consecutiveFailures, checkedAt: new Date(now) },
});

test('health thresholds are bounded and opt-in', () => {
  assert.deepEqual(healthPolicy(), {
    manualDown: false,
    manualDegraded: false,
    responseTimeMs: 0,
    failuresBeforeDown: 1,
  });
  for (const invalid of [
    null,
    [],
    { manualDegraded: 'true' },
    { manualDown: 'true' },
    { responseTimeMs: -1 },
    { responseTimeMs: '500' },
    { responseTimeMs: 120001 },
    { failuresBeforeDown: 0 },
    { failuresBeforeDown: 11 },
    { failuresBeforeDown: 1.5 },
  ])
    assert.throws(() => healthPolicy(invalid));
});
test('slow successes degrade and consecutive failures escalate without treating stale checks as healthy', () => {
  const policy = { responseTimeMs: 500, failuresBeforeDown: 3 };
  assert.equal(monitorHealth(monitor('up', 499), policy, now), 'up');
  assert.equal(monitorHealth(monitor('up', 500), policy, now), 'degraded');
  assert.equal(monitorHealth(monitor('down', 50, 1), policy, now), 'degraded');
  assert.equal(monitorHealth(monitor('down', 50, 3), policy, now), 'down');
  assert.equal(monitorHealth(monitor('down', 50, 1), {}, now), 'down');
  assert.equal(monitorHealth(monitor('down', 50, 3), policy, now + 180000), 'unknown');
  assert.equal(monitorHealth({ ...monitor('up', 600), paused: true }, policy, now), 'unknown');
});
test('manual and dependency degradation propagates without concealing outages', () => {
  const services = [
    { id: 'a', dependencyIds: [], healthPolicy: { manualDegraded: true } },
    { id: 'b', dependencyIds: ['a'] },
  ];
  assert.equal(serviceHealth(services, [monitor('up')], now).get('b'), 'degraded');
  assert.equal(serviceHealth(services, [monitor('down', 100, 1)], now).get('b'), 'down');
  assert.equal(rollupHealth(['up', 'degraded', 'unknown']), 'degraded');
  assert.equal(rollupHealth(['up', 'unknown']), 'unknown');
  const after = publicSnapshot({ services }, [monitor('up')], now);
  assert.match(updateText(null, after), /Status: Degraded/);
});

test('manual down overrides successful checks and propagates until cleared', () => {
  const service = { id: 'a', dependencyIds: [], healthPolicy: { manualDown: true } };
  const dependent = { id: 'b', dependencyIds: ['a'] };
  assert.equal(serviceHealth([service, dependent], [monitor('up')], now).get('b'), 'down');
  assert.equal(serviceHealth([service], [], now).get('a'), 'down');
  service.healthPolicy.manualDown = false;
  assert.equal(serviceHealth([service], [monitor('up')], now).get('a'), 'up');
});
