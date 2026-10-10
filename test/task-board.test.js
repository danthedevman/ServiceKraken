import test from 'node:test';
import assert from 'node:assert/strict';
import { rankBetween, taskRank, taskLaneFilter } from '../shared/domain/task-board.js';

test('task ranks preserve legacy ordering and leave room for repeated insertions', () => {
  const low = taskRank({ id: '111111111111111111111111' });
  const high = taskRank({ id: '111111111111111111111112' });
  let next = high;
  for (let index = 0; index < 100; index++) {
    next = rankBetween(low, next);
    assert.ok(low < next && next < high);
    assert.equal(next.length, 64);
  }
  assert.ok(rankBetween(null, low) < low);
  assert.ok(rankBetween(high, null) > high);
  assert.throws(() => rankBetween(low, low), /Refresh/);
});

test('custom status lanes do not absorb canonical or other custom options', () => {
  assert.deepEqual(taskLaneFilter('todo', 'todo'), {
    $or: [{ statusOption: 'todo' }, { statusOption: null, status: 'todo' }],
  });
  assert.deepEqual(taskLaneFilter('aaaaaaaaaaaaaaaaaaaaaaaa', 'todo'), {
    statusOption: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  });
});
