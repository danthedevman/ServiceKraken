import { createHash } from 'node:crypto';
import { InputError } from '../validation/input-error.js';

/** Opaque identifiers keep email addresses and bearer tokens out of queue IDs and database indexes. */
export const digest = (value) => createHash('sha256').update(value).digest('hex');

/** Only an operator-configured origin is used for emailed links; never trust request Host headers. */
export function publicOrigin(value) {
  try {
    if (typeof value !== 'string' || value.length > 300) throw new Error();
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new InputError(
      'Enter an HTTPS origin, such as https://status.example.com. Local development may use HTTP.',
      400,
      { publicOrigin: 'Enter a valid public origin without a path.' },
    );
  }
}

/** Allow only an enabled SMTP integration explicitly selected for public subscriptions. */
export async function subscriptionMailer(db, page) {
  if (!page.emailSubscriptions || !page.subscriptionIntegrationId) return null;
  const settings = await db.collection('operations').findOne({ _id: page._id });
  return (
    settings?.integrations?.find(
      (item) =>
        item.id === page.subscriptionIntegrationId &&
        item.type === 'email' &&
        item.enabled &&
        item.smtpConfigured &&
        item.secret &&
        !item.demoBatchId,
    ) ?? null
  );
}

/** Normalize a single subscriber address and reject header injection or structured values. */
export function subscriberEmail(value) {
  if (
    typeof value !== 'string' ||
    value.length > 254 ||
    !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value.trim())
  )
    throw new InputError('Enter a valid email address.', 400, {
      email: 'Enter a valid email address.',
    });
  return value.trim().toLowerCase();
}

/** Return only advertised subscription capabilities, never integration credentials or recipients. */
export async function subscriptionInfo(db, page) {
  return {
    emailEnabled: !!(await subscriptionMailer(db, page)),
    rssPath: `/api/public/status/${page.publicToken}/feed.xml`,
  };
}
