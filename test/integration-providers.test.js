import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationUrl } from '../shared/integrations/provider-url.js';
import { integrationErrors } from '../shared/integrations/integration-validation.js';
import { seal } from '../shared/integrations/secrets.js';
import { sendNotification } from '../workers/src/notifications/send.js';

const urls = {
  discord: 'https://discord.com/api/webhooks/123/token',
  pagerduty: 'https://events.pagerduty.com/v2/enqueue',
  github: 'https://api.github.com/repos/team/project',
  jira: 'https://team.atlassian.net/',
  webhook: 'https://alerts.example.com/events',
};
const incident = {
  _id: 'a'.repeat(24),
  workspaceId: 'b'.repeat(24),
  title: 'API unavailable',
  description: 'Timeouts',
  serviceName: 'Checkout',
  severity: 'high',
  privateNotes: 'Must stay private',
};

test('new destinations reject spoofed hosts, credentials, redirects and private webhook literals', () => {
  for (const [type, url] of Object.entries(urls)) {
    assert.equal(integrationUrl(url, type), url);
    for (const unsafe of [
      url.replace('https:', 'http:'),
      url.replace('https://', 'https://user:password@'),
      `${url}#fragment`,
    ])
      assert.throws(() => integrationUrl(unsafe, type));
    if (type !== 'webhook')
      assert.throws(() => integrationUrl('https://attacker.example.com/', type));
  }
  for (const url of [
    'https://127.0.0.1/',
    'https://169.254.169.254/',
    'https://10.0.0.1/',
    'https://localhost/',
    'https://host.internal/',
  ])
    assert.throws(() => integrationUrl(url, 'webhook'));
});

test('required credentials, formats and header injection are validated in shared forms', () => {
  const base = { name: 'Example', enabled: true, recovery: true, onCall: false };
  for (const type of ['pagerduty', 'github', 'jira']) {
    const value = { ...base, type, url: urls[type] };
    assert.ok(Object.keys(integrationErrors(value)).length);
    assert.deepEqual(integrationErrors(value, { configured: true }), {});
  }
  assert.ok(
    integrationErrors({
      ...base,
      type: 'github',
      url: urls.github,
      token: 'secret\r\nInjected: yes',
    }).token,
  );
  assert.ok(
    integrationErrors({
      ...base,
      type: 'jira',
      url: urls.jira,
      username: 'team@example.com',
      password: 'token',
      projectKey: 'A" OR 1=1',
      issueTypeId: '1',
    }).projectKey,
  );
});

test('new adapters send allowlisted labeled messages, suppress mentions and correlate recovery', async (t) => {
  const previous = process.env.INTEGRATION_ENCRYPTION_KEY;
  process.env.INTEGRATION_ENCRYPTION_KEY = 'ab'.repeat(32);
  t.after(() =>
    previous === undefined
      ? delete process.env.INTEGRATION_ENCRYPTION_KEY
      : (process.env.INTEGRATION_ENCRYPTION_KEY = previous),
  );
  for (const type of Object.keys(urls)) {
    const calls = [];
    const request = async (url, method, payload, headers) => {
      calls.push({ url, method, payload, headers });
      if (url.includes('/search')) return { items: [], issues: [] };
      if (type === 'pagerduty') return { status: 'success', dedup_key: 'same-alert' };
      if (type === 'github') return { number: 42 };
      if (type === 'jira') return { key: 'OPS-42' };
      return {};
    };
    const integration = {
      type,
      secret: seal({
        url: urls[type],
        token: 'secret',
        username: 'team@example.com',
        password: 'secret',
        projectKey: 'OPS',
        issueTypeId: '1',
      }),
    };
    const result = await sendNotification(
      integration,
      incident,
      { _id: 'delivery-1', event: 'impacted' },
      null,
      request,
    );
    const payload = calls.at(-1).payload;
    assert.ok(JSON.stringify(payload).includes('Description'));
    assert.ok(!JSON.stringify(payload).includes('Must stay private'));
    if (type === 'discord') assert.deepEqual(payload.allowed_mentions, { parse: [] });
    if (type === 'webhook') {
      assert.equal(payload.deliveryId, 'delivery-1');
      assert.equal(calls[0].headers.Authorization, 'Bearer secret');
    }
    if (['pagerduty', 'github', 'jira'].includes(type)) {
      const before = calls.length;
      await sendNotification(
        integration,
        incident,
        { event: 'recovered', externalId: result.externalId },
        null,
        request,
      );
      assert.equal(calls.length, before + 1);
      if (type === 'pagerduty') {
        assert.equal(calls.at(-1).payload.event_action, 'resolve');
        assert.equal(calls.at(-1).payload.dedup_key, calls[0].payload.dedup_key);
      } else assert.match(calls.at(-1).url, /\/comments?$/);
    }
  }
});

test('ticket adapters find existing correlated tickets and never create a ticket for recovery', async () => {
  const { sendTicket } = await import('../workers/src/notifications/tickets.js');
  for (const type of ['github', 'jira']) {
    const secret = {
      url: urls[type],
      token: 'secret',
      projectKey: 'OPS',
      username: 'user',
      password: 'secret',
    };
    let count = 0;
    const existing = await sendTicket(
      type,
      secret,
      incident,
      { event: 'impacted' },
      'Description: test',
      async () => {
        count++;
        return { items: [{ number: 42 }], issues: [{ key: 'OPS-42' }] };
      },
    );
    assert.ok(existing.externalId);
    assert.equal(count, 1);
    await assert.rejects(
      sendTicket(type, secret, incident, { event: 'recovered' }, 'Description: test', async () => ({
        items: [],
        issues: [],
      })),
      /Waiting/,
    );
  }
});
