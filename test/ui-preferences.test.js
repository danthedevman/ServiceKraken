import test from 'node:test';
import assert from 'node:assert/strict';
import { uiPreferences, preferencePatch } from '../shared/domain/ui-preferences.js';
import { auditStamp, auditFields } from '../shared/domain/audit.js';

test('layout preferences accept only boolean changes and exclude unrelated user data', () => {
  assert.deepEqual(uiPreferences({ leftCollapsed: true, rightCollapsed: 'true', role: 'admin' }), {
    leftCollapsed: true,
    rightCollapsed: false,
  });
  for (const value of [
    null,
    [],
    {},
    { leftCollapsed: 'false' },
    { role: 'admin' },
    { 'uiPreferences.leftCollapsed': true },
  ])
    assert.throws(() => preferencePatch(value), /valid sidebar preference/);
  assert.deepEqual(preferencePatch({ rightCollapsed: true }), { rightCollapsed: true });
});
test('audit stamps preserve original authors without inventing legacy creation history', () => {
  const actor = { _id: 'user-1', email: 'admin@example.com' },
    time = new Date('2026-10-05T12:00:00Z');
  const created = auditStamp(null, actor, time);
  assert.equal(created.createdById, 'user-1');
  assert.equal(created.revision, 0);
  const updated = auditStamp(
    created,
    { _id: 'user-2', email: 'responder@example.com' },
    new Date(+time + 1000),
  );
  assert.equal(updated.createdById, 'user-1');
  assert.equal(updated.updatedById, 'user-2');
  assert.equal(updated.revision, 1);
  assert.equal(auditStamp({ id: 'legacy' }, actor, time).createdAt, undefined);
  assert.equal(
    auditFields({ ...updated, passwordHash: 'private', secret: 'private' }).secret,
    undefined,
  );
});
