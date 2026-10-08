import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureIntegrationKey } from '../shared/integrations/integration-key.js';

test('API and workers share one atomically initialized durable encryption key', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'servicekraken-key-')),
    path = join(dir, 'integration.key'),
    previous = process.env.INTEGRATION_ENCRYPTION_KEY;
  delete process.env.INTEGRATION_ENCRYPTION_KEY;
  t.after(async () => {
    if (previous === undefined) delete process.env.INTEGRATION_ENCRYPTION_KEY;
    else process.env.INTEGRATION_ENCRYPTION_KEY = previous;
    await rm(dir, { recursive: true, force: true });
  });
  await Promise.all([
    ensureIntegrationKey(path),
    ensureIntegrationKey(path),
    ensureIntegrationKey(path),
  ]);
  const key = await readFile(path, 'utf8');
  assert.match(key, /^[a-f\d]{64}$/);
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  await ensureIntegrationKey(path);
  assert.equal(await readFile(path, 'utf8'), key);
  process.env.INTEGRATION_ENCRYPTION_KEY = '00'.repeat(32);
  await assert.rejects(ensureIntegrationKey(path), /differs/);
  assert.equal(await readFile(path, 'utf8'), key);
});
