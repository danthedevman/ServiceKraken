import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { connectDatabase } from '../../shared/persistence/database.js';
import { validateMonitor } from '../../shared/validation/validation.js';
import { dispatchDue, processMonitor } from '../../workers/src/monitoring/processor.js';

test('retired monitor types cannot be created, scheduled, or executed; migration removes credentials', async (t) => {
  process.env.DATABASE_SCHEMA =
    process.env.MONGODB_DB = `http_only_${randomUUID().replaceAll('-', '')}`;
  const { db, client } = await connectDatabase();
  t.after(async () => {
    await db.dropDatabase();
    await client.close();
  });
  for (const type of ['postgres', 'mysql', 'mongodb', 'redis', 'unknown']) {
    assert.throws(
      () =>
        validateMonitor({ type, name: 'Legacy', url: 'https://example.com', intervalMinutes: 1 }),
      /Only HTTP/,
    );
  }
  const { insertedId } = await db.collection('monitors').insertOne({
    type: 'postgres',
    name: 'Legacy',
    paused: false,
    nextCheckAt: new Date(0),
    connectionSecret: 'encrypted-old-value',
    username: 'reader',
    host: 'private.example',
    intervalMinutes: 1,
  });
  await dispatchDue(db, { addBulk: async () => assert.fail('Retired check queued') });
  assert.equal(
    await processMonitor(db, String(insertedId), async () => assert.fail('Retired check executed')),
    false,
  );
  const reopened = await connectDatabase();
  await reopened.client.close();
  const monitor = await db.collection('monitors').findOne({ _id: insertedId });
  assert.equal(monitor.paused, true);
  assert.equal(monitor.name, 'Legacy');
  assert.equal(monitor.connectionSecret, undefined);
  assert.equal(monitor.username, undefined);
  assert.equal(monitor.host, undefined);
});
