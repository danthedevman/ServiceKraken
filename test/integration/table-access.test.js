import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { connectDatabase } from '../../shared/persistence/database.js';
import { createApp } from '../../api/src/app.js';

test('server tables and references enforce workspace, parent-record, and internal-note visibility', async (t) => {
  process.env.DATABASE_SCHEMA =
    process.env.MONGODB_DB = `table_test_${randomUUID().replaceAll('-', '')}`;
  const { db, client } = await connectDatabase();
  const server = createApp(db).listen(0, '0.0.0.0');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.dropDatabase();
    await client.close();
  });
  const root = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (path, cookie, method = 'GET', body) => {
    const response = await fetch(root + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'ServiceKraken',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0],
    };
  };
  const a = await request('/auth/register', null, 'POST', {
    displayName: 'Owner A',
    email: 'a@table.example',
    password: 'table tests secure password A',
  });
  const b = await request('/auth/register', null, 'POST', {
    displayName: 'Owner B',
    email: 'b@table.example',
    password: 'table tests secure password B',
  });
  const workspaceId = new ObjectId(a.data.user.id),
    incidentId = new ObjectId();
  await db.collection('incidents').insertOne({
    _id: incidentId,
    workspaceId,
    title: 'Private incident',
    createdById: a.data.user.id,
    openedForId: a.data.user.id,
    timeline: [],
    attachmentIds: [],
    knowledgeIds: [],
  });
  await db.collection('incidentComments').insertMany([
    {
      workspaceId,
      incidentId,
      kind: 'comment',
      body: 'Customer update',
      author: 'Owner A',
      createdAt: new Date(),
    },
    {
      workspaceId,
      incidentId,
      kind: 'work_note',
      body: 'Internal secret',
      author: 'Owner A',
      createdAt: new Date(),
    },
  ]);
  assert.equal((await request(`/tables/comments?recordId=${incidentId}`, a.cookie)).data.total, 2);
  assert.equal((await request(`/tables/comments?recordId=${incidentId}`, b.cookie)).status, 404);
  assert.equal(
    (await request(`/tables/attachments?recordId=${incidentId}&recordKind=incidents`, b.cookie))
      .status,
    404,
  );
  const references = await request(
    `/references/incidents?q=Private&selected=${incidentId}`,
    b.cookie,
  );
  assert.deepEqual(references.data.options, []);
  assert.deepEqual(references.data.selected, []);
  // Workspace owners remain admins; exercise the supported session-scoped viewer preview.
  assert.equal((await request('/auth/role', a.cookie, 'POST', { role: 'viewer' })).status, 200);
  assert.equal((await request(`/tables/comments?recordId=${incidentId}`, a.cookie)).data.total, 1);
  assert.equal((await request('/tables/integrations', a.cookie)).status, 403);
  assert.equal((await request('/tables/deliveries', a.cookie)).status, 403);
  const exported = await fetch(`${root}/tables/comments?recordId=${incidentId}&export=csv`, {
    headers: { Cookie: a.cookie },
  });
  const csv = await exported.text();
  assert.ok(csv.includes('Customer update'));
  assert.ok(!csv.includes('Internal secret'));
  const members = await request('/tables/members', b.cookie);
  assert.equal(members.data.total, 1);
  assert.equal(members.data.rows[0].email, 'b@table.example');
  assert.ok(!JSON.stringify(members.data).includes('password'));
});
