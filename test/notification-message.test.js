import test from 'node:test';
import nodemailer from 'nodemailer';
import assert from 'node:assert/strict';
import { message } from '../workers/src/notifications/message.js';
import { sendNotification } from '../workers/src/notifications/send.js';
import { seal } from '../shared/integrations/secrets.js';

const incident = {
  _id: '0123456789abcdef01234567',
  title: 'Checkout unavailable',
  serviceName: 'Checkout API',
  severity: 'high',
  description: 'Requests time out.\nEngineers are investigating.',
  workNotes: 'Private note that must not be sent',
};

test('all notification events label descriptions and multiline values without exposing extra fields', () => {
  for (const event of ['impacted', 'recovered', 'comment']) {
    const text = message(incident, event, {
      commentAuthor: 'Sam',
      commentBody: 'Checking\r\nNext step',
    });
    for (const label of ['Event', 'Title', 'Service', 'Severity', 'Incident', 'Description'])
      assert.ok(text.includes(`${label}: `));
    assert.match(text, /Description: Requests time out\.\n {2}Engineers are investigating\./);
    assert.ok(!text.includes(incident.workNotes));
    if (event === 'comment')
      assert.match(text, /Comment author: Sam\nComment: Checking\n {2}Next step/);
  }
  assert.match(message({ ...incident, description: '' }, 'impacted'), /Description: Not provided/);
});

test('Slack, Teams, and ServiceNow carry the same labeled message with Slack escaping preserved', async (t) => {
  const previousKey = process.env.INTEGRATION_ENCRYPTION_KEY;
  process.env.INTEGRATION_ENCRYPTION_KEY = 'ab'.repeat(32);
  t.after(() => {
    if (previousKey === undefined) delete process.env.INTEGRATION_ENCRYPTION_KEY;
    else process.env.INTEGRATION_ENCRYPTION_KEY = previousKey;
  });
  const value = { ...incident, description: '<!channel> & <script>\nSecond line' };
  const providers = {
    slack: 'https://hooks.slack.com/services/A/B/C',
    teams: 'https://example.webhook.office.com/webhookb2/test',
    servicenow: 'https://test.service-now.com',
  };
  for (const [type, url] of Object.entries(providers)) {
    const calls = [];
    const request = async (_url, method, body) => {
      calls.push({ method, body });
      return method === 'GET'
        ? { result: [] }
        : { result: { sys_id: 'a'.repeat(32), number: 'INC001' } };
    };
    await sendNotification(
      { type, secret: seal({ url, username: 'test', password: 'secret' }) },
      value,
      { event: 'impacted' },
      null,
      request,
    );
    const payload = calls.at(-1).body;
    const expected = message(value, 'impacted');
    if (type === 'slack') {
      assert.equal(
        payload.text,
        expected.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
      );
      assert.equal(payload.mrkdwn, false);
    } else if (type === 'teams')
      assert.equal(payload.attachments[0].content.body[0].text, expected);
    else assert.equal(payload.description, expected);
  }
});

test('email uses labeled incident and comment fields without sending a real message', async (t) => {
  const previousKey = process.env.INTEGRATION_ENCRYPTION_KEY;
  process.env.INTEGRATION_ENCRYPTION_KEY = 'ab'.repeat(32);
  t.after(() => {
    if (previousKey === undefined) delete process.env.INTEGRATION_ENCRYPTION_KEY;
    else process.env.INTEGRATION_ENCRYPTION_KEY = previousKey;
  });
  let sent;
  t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async (payload) => {
      sent = payload;
      return { rejected: [] };
    },
    close: () => {},
  }));
  const delivery = {
    _id: 'delivery-id',
    event: 'comment',
    commentAuthor: 'Sam',
    commentBody: 'An update',
  };
  await sendNotification(
    {
      type: 'email',
      recipients: ['recipient@example.com'],
      secret: seal({ smtp: { host: '8.8.8.8', port: 465, from: 'sender@example.com' } }),
    },
    incident,
    delivery,
  );
  assert.equal(sent.text, message(incident, 'comment', delivery));
  assert.match(sent.text, /Description: Requests time out/);
  assert.equal(sent.disableFileAccess, true);
  assert.equal(sent.disableUrlAccess, true);
});
