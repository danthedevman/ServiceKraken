import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { connectDatabase } from '../../shared/persistence/database.js';
import { createApp } from '../../api/src/app.js';

test('admin role previews enforce permissions without changing identity or other sessions', async (t) => {
  process.env.DATABASE_SCHEMA =
    process.env.MONGODB_DB = `role_test_${randomUUID().replaceAll('-', '')}`;
  const { db, client } = await connectDatabase(),
    server = createApp(db).listen(0, '0.0.0.0');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.dropDatabase();
    await client.close();
  });
  const request = async (path, cookie, method = 'GET', body, extra = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'ServiceTrident',
        ...(cookie ? { Cookie: cookie } : {}),
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      data: response.status === 204 ? null : await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0],
    };
  };
  const credentials = {
    displayName: 'Test user',
    email: 'admin@example.com',
    password: 'long role preview test password',
  };
  const owner = await request('/auth/register', null, 'POST', credentials);
  const second = await request('/auth/login', null, 'POST', credentials);
  const invite = await request('/invitations', owner.cookie, 'POST', {
    email: 'viewer@example.com',
    displayName: 'Viewer',
    role: 'viewer',
  });
  const viewer = await request('/auth/invite', null, 'POST', {
    token: invite.data.inviteUrl.split('/').at(-1),
    password: 'long invited role test password',
  });
  assert.equal((await request('/auth/role', viewer.cookie, 'POST', { role: 'admin' })).status, 403);
  assert.equal((await request('/auth/role', owner.cookie, 'POST', { role: 'owner' })).status, 400);
  assert.equal(
    (
      await request(
        '/auth/role',
        owner.cookie,
        'POST',
        { role: 'viewer' },
        { Origin: 'https://evil.example' },
      )
    ).status,
    403,
  );
  const preview = await request('/auth/role', owner.cookie, 'POST', { role: 'viewer' });
  assert.equal(preview.data.user.id, owner.data.user.id);
  assert.equal(preview.data.user.role, 'viewer');
  assert.equal(preview.data.user.actualRole, 'admin');
  assert.equal(preview.data.user.impersonating, true);
  assert.equal((await request('/auth/me', owner.cookie)).data.user.role, 'viewer');
  assert.equal((await request('/auth/me', second.cookie)).data.user.role, 'admin');
  assert.equal((await request('/services', owner.cookie, 'POST', { name: 'Denied' })).status, 403);
  assert.equal((await request('/tasks', owner.cookie, 'POST', { title: 'Denied' })).status, 403);
  await request('/auth/role', owner.cookie, 'POST', { role: 'responder' });
  assert.equal((await request('/tasks', owner.cookie, 'POST', { title: 'Allowed' })).status, 201);
  const service = (await request('/services', second.cookie, 'POST', { name: 'API' })).data.item;
  await db.collection('incidents').insertOne({
    workspaceId: new ObjectId(owner.data.user.id),
    title: 'Someone else',
    createdById: viewer.data.user.id,
    openedForId: viewer.data.user.id,
    serviceId: service.id,
    status: 'open',
    severity: 'high',
    createdAt: new Date(),
  });
  await request('/auth/role', owner.cookie, 'POST', { role: 'user' });
  assert.equal((await request('/tasks', owner.cookie)).status, 403);
  assert.equal((await request('/incidents', owner.cookie)).data.total, 0);
  const restored = await request('/auth/role', owner.cookie, 'POST', { role: 'admin' });
  assert.equal(restored.data.user.impersonating, false);
  assert.equal((await request('/services', owner.cookie, 'POST', { name: 'Allowed' })).status, 201);
  // A stored preview can never preserve admin rights after the account is demoted.
  await db
    .collection('users')
    .updateOne(
      { _id: new ObjectId(owner.data.user.id) },
      { $set: { workspaceId: new ObjectId(owner.data.user.id), role: 'viewer' } },
    );
  assert.equal((await request('/auth/role', owner.cookie, 'POST', { role: 'admin' })).status, 403);
  assert.equal((await request('/auth/me', owner.cookie)).data.user.role, 'viewer');
});
