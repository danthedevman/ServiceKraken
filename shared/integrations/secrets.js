import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { InputError } from '../validation/validation.js';

/** Require a deployment-owned encryption key; no insecure fallback for secrets. */
export function encryptionKey() {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!/^[a-f0-9]{64}$/i.test(key ?? ''))
    throw new InputError(
      'Set INTEGRATION_ENCRYPTION_KEY to 64 hexadecimal characters in the API and workers, then restart.',
      503,
    );
  return Buffer.from(key, 'hex');
}

/** Encrypt integration secrets at rest using authenticated encryption. */
export function seal(value) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  return [
    iv.toString('hex'),
    cipher.update(JSON.stringify(value), 'utf8', 'hex') + cipher.final('hex'),
    cipher.getAuthTag().toString('hex'),
  ].join('.');
}

/** Decrypt only inside the worker or while an admin updates existing configuration. */
export function unseal(value) {
  const [iv, data, tag] = value.split('.');
  const cipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'hex'));
  cipher.setAuthTag(Buffer.from(tag, 'hex'));
  return JSON.parse(cipher.update(data, 'hex', 'utf8') + cipher.final('utf8'));
}
