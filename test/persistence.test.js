import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId, Binary } from 'mongodb';
import { Query } from '../shared/persistence/postgres/query.js';
import { encode, decode } from '../shared/persistence/postgres/codec.js';
import { updateRecord } from '../shared/persistence/postgres/updates.js';

test('persistence roundtrips identifiers, dates, attachment bytes and ordinary strings', () => {
  const row = {
    _id: new ObjectId(),
    at: new Date(),
    body: '2026-10-07',
    data: new Binary(Buffer.from([0, 1, 255])),
    values: [false, null, 12],
  };
  const saved = decode(JSON.parse(JSON.stringify(encode(row))));
  assert.ok(saved._id.equals(row._id));
  assert.equal(+saved.at, +row.at);
  assert.equal(saved.body, row.body);
  assert.deepEqual(saved.data.buffer, row.data.buffer);
});
test('query compiler binds hostile strings and rejects unsupported field and operator syntax', () => {
  const q = new Query();
  const text = q.filter({ workspaceId: new ObjectId(), email: "x'; DROP TABLE users; --" });
  assert.ok(!text.includes('DROP TABLE'));
  assert.ok(q.values.some((value) => String(value).includes('DROP TABLE')));
  assert.throws(() => new Query().filter({ 'x); DELETE': 1 }), /Invalid persistence field/);
  assert.throws(() => new Query().filter({ $where: 'true' }), /Unsupported filter/);
  const empty = new Query();
  assert.equal(empty.filter({ _id: { $in: [] } }), 'false');
  assert.deepEqual(empty.values, []);
});
test('claim expressions use the supplied database timestamp and preserve immutable source data', () => {
  const now = new Date('2026-10-07T00:00:00Z');
  const row = { _id: new ObjectId(), intervalMinutes: 0 };
  const result = updateRecord(
    row,
    [
      {
        $set: {
          nextCheckAt: {
            $dateAdd: {
              startDate: '$$NOW',
              unit: 'minute',
              amount: { $max: [1, '$intervalMinutes'] },
            },
          },
          checkSequence: { $add: [{ $ifNull: ['$checkSequence', 0] }, 1] },
        },
      },
    ],
    now,
  );
  assert.equal(+result.nextCheckAt, +now + 60000);
  assert.equal(result.checkSequence, 1);
  assert.equal(row.nextCheckAt, undefined);
  assert.throws(
    () => updateRecord(row, { $set: { '__proto__.unsafe': true } }, now),
    /Invalid update field/,
  );
});
