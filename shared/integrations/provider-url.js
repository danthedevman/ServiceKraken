import { invalid } from '../validation/fields.js';
import { text } from '../validation/fields.js';

/** Restrict webhook destinations to official provider HTTPS domains, without redirects. */
export function integrationUrl(value, type) {
  value = text(value, 'url', 4096);
  let url;
  try {
    url = new URL(value);
  } catch {
    invalid('url', 'Enter the provider HTTPS URL.');
  }
  const host = url.hostname.toLowerCase();
  const valid =
    type === 'slack'
      ? host === 'hooks.slack.com' && url.pathname.startsWith('/services/')
      : type === 'teams'
        ? ['.environment.api.powerplatform.com', '.logic.azure.com', '.webhook.office.com'].some(
            (suffix) => host.endsWith(suffix),
          )
        : type === 'servicenow'
          ? host.endsWith('.service-now.com') && url.pathname === '/' && !url.search
          : false;
  if (
    !valid ||
    url.protocol !== 'https:' ||
    (url.port && url.port !== '443') ||
    url.username ||
    url.password ||
    url.hash
  )
    invalid('url', 'Use an official provider HTTPS URL (ServiceNow: instance root URL).');
  return url.href;
}
