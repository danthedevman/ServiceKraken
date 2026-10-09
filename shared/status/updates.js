import { serviceHealth } from '../domain/service-health.js';

/** Public snapshots exclude monitor targets, incident records, subscribers, and unpublished announcements. */
export function publicSnapshot(page, monitors, now = Date.now()) {
  const health = serviceHealth(page.services, monitors, now);
  const message = (value) => (value?.enabled ? { level: value.level, text: value.text } : null);
  return {
    banner: message(page.banner),
    services: page.services
      .map((service) => ({
        id: service.id,
        name: service.name,
        status: health.get(service.id),
        message: message(page.serviceMessages?.find((item) => item.serviceId === service.id)),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}
const stateLabel = (value) =>
  ({ up: 'Operational', down: 'Down', degraded: 'Degraded', unknown: 'Unknown' })[value] ??
  'Unknown';
const line = (label, value) =>
  `${label}: ${String(value).replace(/\r\n?/g, '\n').replaceAll('\n', '\n  ')}`;

/** Describe changes using labeled plain text that is safe to send outside the workspace. */
export function updateText(before, after) {
  const parts = [];
  if (JSON.stringify(before?.banner ?? null) !== JSON.stringify(after.banner))
    parts.push(
      after.banner
        ? `${line('Announcement', after.banner.text)}\n${line('Criticality', after.banner.level)}`
        : 'Announcement: Removed',
    );
  for (const service of after.services) {
    const old = before?.services.find((item) => item.id === service.id);
    if (JSON.stringify(old) === JSON.stringify(service)) continue;
    parts.push(
      [
        line('Service', service.name),
        line('Status', stateLabel(service.status)),
        ...(service.message
          ? [line('Message', service.message.text), line('Criticality', service.message.level)]
          : old?.message
            ? ['Message: Removed']
            : []),
      ].join('\n'),
    );
  }
  for (const old of before?.services ?? [])
    if (!after.services.some((service) => service.id === old.id))
      parts.push(`${line('Service', old.name)}\nStatus: Removed from status page`);
  return parts.join('\n\n') || 'Status: No services published';
}

/** Escape both XML and embedded RSS description HTML; invalid XML codepoints are discarded. */
export function xml(value) {
  return Array.from(String(value))
    .filter((char) => {
      const code = char.codePointAt(0);
      return (
        [9, 10, 13].includes(code) ||
        (code >= 32 && code <= 0xd7ff) ||
        (code >= 0xe000 && code <= 0xfffd) ||
        code >= 0x10000
      );
    })
    .join('')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** A bounded RSS 2.0 feed uses stable item IDs and only stored public updates. */
export function rssFeed(url, updates) {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ServiceTrident service status</title><link>${xml(url)}</link><description>Service health and published announcements</description><ttl>5</ttl>${updates.map((item) => `<item><title>${xml(item.title)}</title><link>${xml(url)}</link><guid isPermaLink="false">${xml(item._id)}</guid><pubDate>${new Date(item.createdAt).toUTCString()}</pubDate><description>${xml(`<pre>${xml(item.text)}</pre>`)}</description></item>`).join('')}</channel></rss>`;
}
