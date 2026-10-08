import test from 'node:test';
import assert from 'node:assert/strict';
import { checkTiming } from '../workers/src/monitoring/processor.js';
import { positiveSetting } from '../workers/src/runtime/config.js';

test('scheduling timing separates dispatch and queue wait without inventing old timestamps', () => {
  const scheduled = new Date('2026-10-02T12:00:00Z');
  const started = new Date('2026-10-02T12:00:05Z');
  const result = checkTiming(scheduled, started, '2026-10-02T12:00:01Z');
  assert.equal(result.scheduleDelayMs, 5000);
  assert.equal(result.dispatchDelayMs, 1000);
  assert.equal(result.queueDelayMs, 4000);
  for (const queuedAt of [undefined, 'invalid', '2026-10-02T11:59:00Z', '2026-10-02T12:01:00Z']) {
    assert.equal(checkTiming(scheduled, started, queuedAt).queueDelayMs, null);
  }
});

test('worker tuning rejects invalid and unsafe bounds', (t) => {
  const previous = process.env.SERVICEKRAKEN_TEST_SETTING;
  t.after(() => {
    if (previous === undefined) delete process.env.SERVICEKRAKEN_TEST_SETTING;
    else process.env.SERVICEKRAKEN_TEST_SETTING = previous;
  });
  process.env.SERVICEKRAKEN_TEST_SETTING = '10';
  assert.equal(positiveSetting('SERVICEKRAKEN_TEST_SETTING', 5, 50), 10);
  for (const value of ['0', '51', '1.5', '', 'abc']) {
    process.env.SERVICEKRAKEN_TEST_SETTING = value;
    assert.throws(() => positiveSetting('SERVICEKRAKEN_TEST_SETTING', 5, 50));
  }
  process.env.SERVICEKRAKEN_TEST_SETTING = '100';
  assert.throws(() => positiveSetting('SERVICEKRAKEN_TEST_SETTING', 1000, 5000, 250));
});
