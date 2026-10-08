import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDependencies } from '../api/src/routes/services.js';
import { rollup } from '../api/src/domain/status.js';

test('dependency validation accepts shared dependencies and rejects indirect cycles', () => {
  assert.doesNotThrow(() =>
    validateDependencies([
      { id: 'a', dependencyIds: ['b', 'c'] },
      { id: 'b', dependencyIds: ['c'] },
      { id: 'c', dependencyIds: [] },
    ]),
  );
  assert.throws(
    () =>
      validateDependencies([
        { id: 'a', dependencyIds: ['b'] },
        { id: 'b', dependencyIds: ['c'] },
        { id: 'c', dependencyIds: ['a'] },
      ]),
    /cycle/,
  );
});

test('status rollups never count missing or paused checks as healthy', () => {
  assert.equal(rollup([]), 'unknown');
  assert.equal(rollup(['up', 'up']), 'up');
  assert.equal(rollup(['up', 'paused']), 'unknown');
  assert.equal(rollup(['up', 'pending']), 'unknown');
  assert.equal(rollup(['unknown', 'down']), 'down');
});
