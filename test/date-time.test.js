import test from 'node:test';
import assert from 'node:assert/strict';
import { dateTime } from '../app/src/lib/date-time.js';
import { timeZoneOptions } from '../app/src/lib/time-zones.js';
import { userDetails } from '../shared/domain/user-details.js';

test('timezone choices include UTC, preserve aliases, and reject invalid profile zones', () => {
  const zones = timeZoneOptions('US/Eastern');
  assert.ok(timeZoneOptions().length <= 40);
  assert.ok(zones.some((zone) => zone.label.includes('US / Canada Eastern')));
  assert.ok(zones.some((zone) => zone.value === 'UTC'));
  assert.ok(zones.some((zone) => zone.value === 'US/Eastern'));
  assert.equal(new Set(zones.map((zone) => zone.value)).size, zones.length);
  assert.throws(() => userDetails({ displayName: 'Test', timeZone: 'Invalid/Zone' }));
  assert.equal(
    userDetails({ displayName: 'Test', timeZone: 'Asia/Kathmandu' }).timeZone,
    'Asia/Kathmandu',
  );
});
test('timestamps use the selected zone including daylight savings and fractional offsets', () => {
  for (const value of ['2026-01-01T12:00:00Z', '2026-07-01T12:00:00Z']) {
    for (const timeZone of ['UTC', 'America/New_York', 'Asia/Kathmandu']) {
      const expected = new Intl.DateTimeFormat(undefined, {
        timeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      }).format(new Date(value));
      assert.equal(dateTime(value, timeZone), expected);
    }
  }
  assert.equal(dateTime('invalid'), 'Unavailable');
  assert.equal(dateTime(null), 'Not checked yet');
});
