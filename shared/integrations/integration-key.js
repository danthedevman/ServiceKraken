import { mkdir, readFile, writeFile, link, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

/** Share one durable key across API/workers. Atomic linking never exposes a partial key file. */
export async function ensureIntegrationKey(
  path = process.env.INTEGRATION_KEY_FILE ||
    fileURLToPath(new URL('../../.servicetrident/integration.key', import.meta.url)),
) {
  const configured = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (configured && !/^[a-f\d]{64}$/i.test(configured))
    throw new Error('The configured integration encryption key is invalid.');
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  let saved;
  try {
    saved = (await readFile(path, 'utf8')).trim();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!saved) {
    const key = configured || randomBytes(32).toString('hex'),
      temporary = `${path}.${randomBytes(12).toString('hex')}.tmp`;
    await writeFile(temporary, key, { mode: 0o600, flag: 'wx' });
    try {
      await link(temporary, path);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    } finally {
      await unlink(temporary);
    }
    saved = (await readFile(path, 'utf8')).trim();
  }
  if (!/^[a-f\d]{64}$/i.test(saved))
    throw new Error('The saved integration encryption key is invalid. Restore the key backup.');
  if (configured && configured.toLowerCase() !== saved.toLowerCase())
    throw new Error(
      'The configured integration key differs from the saved key. Restore the original key before starting.',
    );
  process.env.INTEGRATION_ENCRYPTION_KEY = saved;
}
