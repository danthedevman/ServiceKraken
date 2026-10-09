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
  const valid = {
    slack: host === 'hooks.slack.com' && url.pathname.startsWith('/services/'),
    teams: ['.environment.api.powerplatform.com', '.logic.azure.com', '.webhook.office.com'].some(
      (suffix) => host.endsWith(suffix),
    ),
    servicenow: host.endsWith('.service-now.com') && url.pathname === '/' && !url.search,
    discord:
      host === 'discord.com' &&
      /^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname) &&
      !url.search,
    pagerduty: host === 'events.pagerduty.com' && url.pathname === '/v2/enqueue' && !url.search,
    github:
      host === 'api.github.com' &&
      /^\/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(url.pathname) &&
      !url.search,
    jira: host.endsWith('.atlassian.net') && url.pathname === '/' && !url.search,
    webhook: host.includes('.') && host !== 'localhost' && !host.endsWith('.localhost'),
  }[type];
  if (
    !valid ||
    url.protocol !== 'https:' ||
    (url.port && url.port !== '443') ||
    url.username ||
    url.password ||
    url.hash
  )
    invalid('url', 'Use a valid public HTTPS endpoint for this provider.');
  if (
    type === 'webhook' &&
    (!/^[a-z0-9.-]+$/i.test(host) ||
      /^[\d.]+$/.test(host) ||
      /(^|\.)(localhost|local|internal|test|invalid|onion)\.?$/.test(host))
  )
    invalid('url', 'Use a public HTTPS hostname.');
  return url.href;
}
