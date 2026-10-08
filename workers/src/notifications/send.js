import nodemailer from 'nodemailer';

import { resolvePublicTarget } from '../monitoring/check.js';
import { integrationUrl } from '@servicekraken/shared/integrations/provider-url';
import { unseal } from '@servicekraken/shared/integrations/secrets';

import { providerRequest } from './http.js';

/** Render plain text; provider-specific markup is escaped or disabled. */
export function message(incident, event) {
  return `${event === 'impacted' ? 'IMPACTED' : 'RECOVERED'}: ${incident.title}\nService: ${incident.serviceName}\nSeverity: ${incident.severity}\nIncident: ${incident._id}\n${incident.description}`;
}

/** Deliver a notification; credentials remain encrypted until this boundary. */
export async function sendNotification(
  integration,
  incident,
  delivery,
  recipient,
  request = providerRequest,
) {
  const secret = integration.secret ? unseal(integration.secret) : {},
    body =
      delivery.event === 'comment'
        ? `New comment on: ${incident.title}\nBy: ${delivery.commentAuthor}\n\n${delivery.commentBody}\n\nIncident: ${incident._id}`
        : message(incident, delivery.event);
  if (integration.type === 'email') {
    const smtp = secret.smtp || {
      host: process.env.SMTP_HOST,
      from: process.env.SMTP_FROM,
      port: Number(process.env.SMTP_PORT ?? 587),
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
    };
    const { host, from, port } = smtp;
    if (!host || !from || ![465, 587].includes(port))
      throw new Error('Configure an email integration before sending.');
    const target = await resolvePublicTarget(`https://${host}`);
    const transporter = nodemailer.createTransport({
      host: target.address,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: { servername: host, rejectUnauthorized: true },
    });
    let deadline;
    try {
      const to = integration.onCall && recipient ? [recipient] : integration.recipients;
      if (!to.length) throw new Error('No active on-call recipient or fallback recipient.');
      const result = await Promise.race([
        transporter.sendMail({
          from,
          to,
          subject: `[ServiceKraken] ${delivery.event}: ${incident.serviceName.replace(/[\r\n]/g, ' ')}`,
          text: body,
          messageId: `<${delivery._id}@servicekraken.local>`,
          disableFileAccess: true,
          disableUrlAccess: true,
        }),
        new Promise((_, reject) => {
          deadline = setTimeout(() => {
            transporter.close();
            reject(new Error('SMTP timed out.'));
          }, 20000);
        }),
      ]);
      if (result.rejected?.length) throw new Error('SMTP rejected one or more recipients.');
      return {};
    } finally {
      clearTimeout(deadline);
      transporter.close();
    }
  }
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
