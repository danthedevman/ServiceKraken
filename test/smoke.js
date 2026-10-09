import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { connectDatabase } from '@servicetrident/shared/persistence/database';

const base = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:8090';
const email = `smoke-${randomUUID()}@example.test`;
const { client, db } = await connectDatabase();
let cookie;

/** Call the running stack through Nginx using a disposable test account.
 * @param {string} path @param {string} [method] @param {object} [body] @returns {Promise<any>}
 */
async function request(path, method = 'GET', body) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'ServiceTrident',
      Origin: process.env.APP_ORIGIN ?? 'http://127.0.0.1:8090',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.ok(response.ok, `${method} ${path}: HTTP ${response.status}`);
  cookie = response.headers.get('set-cookie')?.split(';')[0] ?? cookie;
  return response.status === 204 ? null : response.json();
}

try {
  assert.equal((await request('/health')).status, 'ok');
  await request('/auth/register', 'POST', { email, password: randomUUID() });
  const ids = [];
  for (const url of ['https://example.com', 'https://example.org']) {
    const { monitor } = await request('/monitors', 'POST', {
      name: 'Disposable smoke check',
      url,
      intervalMinutes: 1,
    });
    ids.push(monitor.id);
  }
  const deadline = Date.now() + 30000;
  let monitors = [];
  do {
    await delay(1000);
    monitors = (await request('/status')).monitors;
  } while (monitors.some((monitor) => !monitor.total) && Date.now() < deadline);
  assert.equal(monitors.length, 2);
  for (const id of ids) {
    const monitor = monitors.find((item) => item.id === id);
    assert.ok(monitor.total >= 1, 'The running worker must persist a check.');
    const { events } = await request(`/monitors/${id}/events`);
    assert.equal(events[0].status, 'up', 'Public example site should return a successful check.');
    assert.equal(events[0].statusCode, 200);
    const detail = await request(`/monitors/${id}/events/${events[0].id}`);
    assert.equal(detail.event.details.method, 'GET');
    assert.equal(detail.event.details.responses.at(-1).statusCode, 200);
    assert.ok(detail.event.details.responses.at(-1).body.text.length > 0);
    const edited = await request(`/monitors/${id}`, 'PATCH', {
      name: 'Edited smoke check',
      intervalMinutes: 2,
    });
    assert.equal(edited.monitor.name, 'Edited smoke check');
    assert.equal(edited.monitor.intervalMinutes, 2);
    await request(`/monitors/${id}`, 'DELETE', {});
  }
  console.log(
    'Live smoke test passed: Nginx → API → MongoDB → BullMQ/Redis → worker → HTTPS → status/history.',
  );
} finally {
  // Only delete this run's uniquely named test account and its associated data.
  const user = await db.collection('users').findOne({ email });
  if (user) {
    await db.collection('monitors').deleteMany({ userId: user._id });
    await db.collection('events').deleteMany({ userId: user._id });
    await db.collection('sessions').deleteMany({ userId: user._id });
    await db.collection('users').deleteOne({ _id: user._id });
  }
  await client.close();
}
