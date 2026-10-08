import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../app/src/data/api.js';

test('mutations announce success and failure, but reads and automatic preferences stay quiet', async (t) => {
  const events = [];
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 200 }));
  const original = globalThis.window;
  globalThis.window = { dispatchEvent: (event) => events.push(event) };
  t.after(() => {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  });
  await api('/services', { method: 'POST', body: {} });
  assert.equal(events.at(-1).detail.tone, 'success');
  await api('/services');
  await api('/auth/preferences', { method: 'PATCH', body: {} });
  assert.equal(events.length, 1);
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 });
  await assert.rejects(api('/services/id', { method: 'DELETE' }), /Permission denied/);
  assert.equal(events.at(-1).detail.tone, 'error');
  assert.equal(events.at(-1).detail.message, 'Permission denied');
});
