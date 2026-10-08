import { sendEmail } from './email.js';
import { integrationUrl } from '@servicekraken/shared/integrations/provider-url';
import { unseal } from '@servicekraken/shared/integrations/secrets';

import { providerRequest } from './http.js';

import { message } from './message.js';

/** Deliver a notification; credentials remain encrypted until this boundary. */
export async function sendNotification(
  integration,
  incident,
  delivery,
  recipient,
  request = providerRequest,
) {
  const secret = integration.secret ? unseal(integration.secret) : {},
    body = message(incident, delivery.event, delivery);
  if (integration.type === 'email')
    return sendEmail(integration, {
      to: integration.onCall && recipient ? [recipient] : integration.recipients,
      subject: `[ServiceKraken] ${delivery.event}: ${incident.serviceName.replace(/[\r\n]/g, ' ')}`,
      text: body,
      id: delivery._id,
    });
  integrationUrl(secret.url, integration.type);
  if (integration.type === 'slack')
    return request(secret.url, 'POST', {
      text: body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      mrkdwn: false,
      unfurl_links: false,
      unfurl_media: false,
    });
  if (integration.type === 'teams')
    return request(secret.url, 'POST', {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.2',
            body: [{ type: 'TextBlock', text: body, wrap: true }],
          },
        },
      ],
    });
  const root = secret.url.replace(/\/$/, ''),
    correlation = `servicekraken:${incident._id}`;
  const headers = {
    Authorization: `Basic ${Buffer.from(`${secret.username}:${secret.password}`).toString('base64')}`,
  };
  const existing = await request(
    `${root}/api/now/table/incident?sysparm_query=${encodeURIComponent(`correlation_id=${correlation}`)}&sysparm_fields=sys_id,number&sysparm_limit=1`,
    'GET',
    undefined,
    headers,
  );
  const record = existing.result?.[0];
  if (record?.sys_id && !/^[a-f0-9]{32}$/.test(record.sys_id))
    throw new Error('ServiceNow returned an invalid incident identifier.');
  if (delivery.event === 'recovered') {
    if (!record) throw new Error('Waiting for the related ServiceNow incident to be created.');
    await request(
      `${root}/api/now/table/incident/${record.sys_id}`,
      'PATCH',
      { work_notes: body },
      headers,
    );
    return { externalId: record.number };
  }
  if (record) return { externalId: record.number };
  const created = await request(
    `${root}/api/now/table/incident`,
    'POST',
    {
      short_description: incident.title,
      description: body,
      correlation_id: correlation,
      impact: incident.severity === 'critical' ? '1' : '2',
      urgency: incident.severity === 'critical' ? '1' : '2',
    },
    headers,
  );
  if (!created.result?.sys_id) throw new Error('ServiceNow did not confirm incident creation.');
  return { externalId: created.result.number };
}
