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
        'X-Requested-With': 'ServiceKraken',
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
  const created = await request('/members', owner.cookie, 'POST', profile);
  assert.equal(created.status, 201);
  assert.equal(created.data.user.passwordHash, undefined);
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
