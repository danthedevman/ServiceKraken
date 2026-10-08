import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardData } from '../app/src/features/dashboard/dashboard-data.js';

test('dashboard weights actual check counts and keeps UTC gaps without inventing uptime', () => {
  const data = {
    generatedAt: '2026-10-01T00:05:00Z',
    monitors: [
      {
        id: 'a',
        status: 'up',
        lastCheck: { durationMs: 42 },
        history: [{ day: '2026-10-01', total: 100, up: 100 }],
      },
      {
        id: 'b',
        status: 'down',
        lastCheck: { durationMs: 100 },
        history: [
          { day: '2026-10-01', total: 1, up: 0 },
          { day: '2026-09-01', total: 10, up: 0 },
        ],
      },
      { id: 'c', status: 'paused', lastCheck: { durationMs: 999 }, history: [] },
      { id: 'd', status: 'unknown', lastCheck: { durationMs: 888 }, history: [] },
    ],
  };
  const result = dashboardData(data, 7);
  assert.equal(result.daily.length, 7);
  assert.equal(result.daily[0].day, '2026-09-25');
  assert.equal(result.daily[0].total, 0);
  assert.equal(result.total, 101);
  assert.equal(result.uptime, 100 / 101);
  assert.equal(result.counts.paused, 1);
  assert.deepEqual(
    result.latency.map((item) => item.id),
    ['b', 'a'],
  );
  const empty = dashboardData({ ...data, monitors: [] });
  assert.equal(empty.uptime, null);
  assert.equal(empty.daily.length, 30);
});
