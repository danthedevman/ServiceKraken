import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { connectDatabase } from '../../shared/persistence/database.js';
import { createApp } from '../../api/src/app.js';

test('admins create profiles and securely reset workspace passwords', async (t) => {
  process.env.DATABASE_SCHEMA =
    process.env.MONGODB_DB = `users_test_${randomUUID().replaceAll('-', '')}`;
  const { db, client } = await connectDatabase();
  const server = createApp(db).listen(0, '0.0.0.0');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.dropDatabase();
    await client.close();
  });
  async function request(path, cookie, method = 'GET', body) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'ServiceTrident',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      data: response.status === 204 ? null : await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0],
    };
  }
  const password = 'a long initial password';
  const owner = await request('/auth/register', null, 'POST', {
    displayName: 'Owner',
    email: 'owner@example.com',
    password,
  });
  assert.equal(owner.status, 201);
  const profile = {
    displayName: 'Casey Morgan',
    email: 'casey@example.com',
    role: 'responder',
    password,
    confirmPassword: password,
    timeZone: 'America/New_York',
  };
  assert.equal(
    (await request('/members', owner.cookie, 'POST', { ...profile, displayName: '' })).status,
    400,
  );
  assert.equal(
    (await request('/members', owner.cookie, 'POST', { ...profile, timeZone: 'invalid-zone' }))
      .status,
    400,
  );
  const groups = await request('/groups', owner.cookie);
  const group = await request('/groups', owner.cookie, 'POST', {
    name: 'Operations',
    memberIds: [],
    revision: groups.data.revision,
  });
  assert.equal(group.status, 201);
  for (const groupIds of [
    'invalid',
    ['000000000000000000000000'],
    [group.data.group.id, group.data.group.id],
  ]) {
    const rejected = await request('/members', owner.cookie, 'POST', { ...profile, groupIds });
    assert.equal(rejected.status, 400);
    assert.equal(await db.collection('users').countDocuments({ email: profile.email }), 0);
  }
  const created = await request('/members', owner.cookie, 'POST', {
    ...profile,
    groupIds: [group.data.group.id],
  });
  assert.equal(created.status, 201);
  assert.deepEqual((await request('/groups', owner.cookie)).data.groups[0].memberIds, [
    created.data.user.id,
  ]);
  assert.equal(created.data.user.passwordHash, undefined);
  const directory = await request('/members', owner.cookie);
  const member = directory.data.members.find((entry) => entry.id === created.data.user.id);
  assert.deepEqual(member.groupIds, [group.data.group.id]);
  const edit = { ...profile, disabled: false, groupIds: [], groupsRevision: member.groupsRevision };
  const memberPath = `/members/${created.data.user.id}`;
  assert.equal(
    (
      await request(memberPath, owner.cookie, 'PATCH', {
        ...edit,
        groupIds: ['000000000000000000000000'],
      })
    ).status,
    400,
  );
  assert.equal((await request(memberPath, owner.cookie, 'PATCH', edit)).status, 200);
  assert.deepEqual((await request('/groups', owner.cookie)).data.groups[0].memberIds, []);
  assert.equal((await request(memberPath, owner.cookie, 'PATCH', edit)).status, 409);
  const updated = await request('/members', owner.cookie);
  edit.groupsRevision = updated.data.members.find(
    (entry) => entry.id === created.data.user.id,
  ).groupsRevision;
  edit.groupIds = [group.data.group.id];
  assert.equal((await request(memberPath, owner.cookie, 'PATCH', edit)).status, 200);
  assert.deepEqual((await request('/groups', owner.cookie)).data.groups[0].memberIds, [
    created.data.user.id,
  ]);
  assert.equal((await request('/members', owner.cookie, 'POST', profile)).status, 400);
  const login = await request('/auth/login', null, 'POST', { email: profile.email, password });
  assert.equal(login.status, 200);
  assert.equal(
    (await request('/members', login.cookie, 'POST', { ...profile, email: 'new@example.com' }))
      .status,
    403,
  );
  const reset = {
    currentPassword: password,
    password: 'a different secure password',
    confirmPassword: 'a different secure password',
  };
  const path = `/members/${created.data.user.id}/password`;
  assert.equal((await request(path, login.cookie, 'PATCH', reset)).status, 403);
  assert.equal(
    (await request(path, owner.cookie, 'PATCH', { ...reset, currentPassword: 'wrong' })).status,
    400,
  );
  assert.equal(
    (await request(path, owner.cookie, 'PATCH', { ...reset, confirmPassword: 'wrong' })).status,
    400,
  );
  const outsider = await request('/auth/register', null, 'POST', {
    displayName: 'Other owner',
    email: 'other@example.com',
    password,
  });
  assert.equal((await request(path, outsider.cookie, 'PATCH', reset)).status, 404);
  assert.equal((await request(path, owner.cookie, 'PATCH', reset)).status, 200);
  assert.equal((await request('/auth/me', login.cookie)).status, 401);
  assert.equal(
    (await request('/auth/login', null, 'POST', { email: profile.email, password })).status,
    401,
  );
  assert.equal(
    (await request('/auth/login', null, 'POST', { email: profile.email, password: reset.password }))
      .status,
    200,
  );
  assert.equal(
    (await request(`/members/${owner.data.user.id}/password`, owner.cookie, 'PATCH', reset)).status,
    409,
  );
  const audit = JSON.stringify(await db.collection('auditEvents').find({}).toArray());
  assert.equal(audit.includes(reset.password), false);
});
