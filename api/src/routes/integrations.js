import { providers } from '@servicetrident/shared/integrations/providers';
import { providerFields } from '@servicetrident/shared/integrations/provider-fields';
import { integrationErrors } from '@servicetrident/shared/integrations/integration-validation';
import { isPublicAddress } from '@servicetrident/shared/validation/validation';
import { isIP } from 'node:net';
import { auditStamp } from '@servicetrident/shared/domain/audit';

import { InputError } from '@servicetrident/shared/validation/validation';
import {
  text,
  choice,
  identifier,
  references,
  invalid,
} from '@servicetrident/shared/validation/fields';

import { seal, unseal } from '@servicetrident/shared/integrations/secrets';
import { integrationUrl } from '@servicetrident/shared/integrations/provider-url';
import { catalog } from './services.js';
import { requireAdmin } from '../auth/auth.js';
import { settings } from '../repositories/settings.js';
import { save } from '../repositories/settings.js';

/** Register integrations routes; authentication and workspace policy run in app.js. */
export function installIntegrationsRoutes(app, db, appOrigin) {
  app.get('/api/integrations', requireAdmin, async (req, res) => {
    const data = await settings(db, req.workspaceId);
    res.json({
      revision: data.revision,
      integrations: data.integrations.map(({ secret, ...item }) => ({
        ...item,
        configured: !!secret,
      })),
      encryptionReady: /^[a-f\d]{64}$/i.test(process.env.INTEGRATION_ENCRYPTION_KEY ?? ''),
    });
  });
  app.put('/api/integrations/:id', requireAdmin, async (req, res) => {
    const data = await settings(db, req.workspaceId),
      integrationId = identifier(req.params.id);
    const previous = data.integrations.find((i) => i.id === integrationId);
    if (!previous && data.integrations.filter((item) => !item.demoBatchId).length >= 20)
      invalid('name', 'Use at most 20 integrations.');
    const body = req.body;
    if (previous?.demoBatchId && body.enabled)
      invalid('enabled', 'Demo integrations cannot send messages.');
    const type = choice(
      body.type,
      providers.map((provider) => provider.id),
      'type',
    );
    if (previous && previous.type !== type)
      invalid('type', 'Create a new integration to change its type.');
    const serviceIds = references(
      body.serviceIds ?? [],
      (await catalog(db, req.workspaceId)).services.map((s) => s.id),
      'serviceIds',
    );
    let secrets = previous?.secret ? unseal(previous.secret) : {};
    const fields = integrationErrors(
      {
        ...body,
        onCall: body.onCall ?? false,
        recovery: body.recovery ?? false,
        enabled: body.enabled ?? false,
      },
      { configured: !!previous?.secret, smtpConfigured: !!previous?.smtpConfigured },
    );
    if (Object.keys(fields).length)
      throw new InputError('Check the highlighted integration fields.', 400, fields);
    if (type === 'email' && (body.smtpHost || !secrets.smtp)) {
      const host = text(body.smtpHost, 'smtpHost', 253).toLowerCase();
      if (isIP(host) && !isPublicAddress(host)) invalid('smtpHost', 'Use a public SMTP server.');
      secrets.smtp = {
        host,
        port: Number(body.smtpPort),
        from: text(body.smtpFrom, 'smtpFrom', 254),
        user: text(body.smtpUser ?? '', 'smtpUser', 200, false),
        password: body.smtpPassword
          ? text(body.smtpPassword, 'smtpPassword', 1000)
          : (secrets.smtp?.password ?? ''),
      };
      if (secrets.smtp.user && !secrets.smtp.password)
        invalid('smtpPassword', 'SMTP password is required when a username is supplied.');
    }
    if (
      type === 'email' &&
      body.enabled &&
      body.commentNotifications &&
      data.integrations.some(
        (item) =>
          item.id !== integrationId &&
          item.enabled &&
          item.type === 'email' &&
          item.commentNotifications &&
          !item.demoBatchId,
      )
    )
      invalid(
        'commentNotifications',
        'Disable comment notifications on the other email integration first.',
      );
    if (type !== 'email') {
      if (body.url) secrets.url = integrationUrl(body.url, type);
      if (!secrets.url) invalid('url', 'Enter a provider URL.');
      for (const field of providerFields[type] || []) {
        if (body[field.key]) secrets[field.key] = text(body[field.key], field.key, field.max);
        if (!field.optional && !secrets[field.key])
          invalid(field.key, `${field.label} is required.`);
      }
      if (type === 'servicenow') {
        if (body.username) secrets.username = text(body.username, 'username', 200);
        if (body.password) secrets.password = text(body.password, 'password', 1000);
        if (!secrets.username || !secrets.password)
          invalid('username', 'Enter the ServiceNow integration user and password.');
      }
    }
    const recipients =
      type === 'email'
        ? text(body.recipients ?? '', 'recipients', 2500, false)
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : [];
    if (
      recipients.length > 10 ||
      recipients.some((v) => !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(v))
    )
      invalid('recipients', 'Enter up to 10 comma-separated email addresses.');
    if (type === 'email' && !recipients.length)
      invalid('recipients', 'Provide at least one fallback recipient for coverage gaps.');
    const item = {
      ...auditStamp(previous, req.user),
      id: integrationId,
      name: text(body.name, 'name', 80),
      type,
      enabled: body.enabled === true,
      recovery: body.recovery === true,
      onCall: body.onCall === true,
      recipients,
      serviceIds,
      commentNotifications: type === 'email' && body.commentNotifications === true,
      smtpConfigured: type === 'email' && !!secrets.smtp,
      destination: type === 'email' ? secrets.smtp?.host || 'SMTP' : new URL(secrets.url).hostname,
      secret: seal(secrets),
    };
    await save(db, data, body.revision, {
      integrations: [...data.integrations.filter((i) => i.id !== integrationId), item],
    });
    res.locals.auditRecordId = integrationId;
    res.json({ ok: true });
  });
  app.delete('/api/integrations/:id', requireAdmin, async (req, res) => {
    const data = await settings(db, req.workspaceId);
    await save(db, data, req.body.revision, {
      integrations: data.integrations.filter((i) => i.id !== identifier(req.params.id)),
    });
    res.status(204).end();
  });
  app.get('/api/deliveries', requireAdmin, async (req, res) => {
    const rows = await db
      .collection('deliveries')
      .find({ workspaceId: req.workspaceId }, { projection: { leaseUntil: 0 } })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();
    res.json({ deliveries: rows.map(({ _id, ...row }) => ({ id: String(_id), ...row })) });
  });
  app.post('/api/deliveries/:id/retry', requireAdmin, async (req, res) => {
    const result = await db.collection('deliveries').updateOne(
      {
        _id: req.params.id,
        workspaceId: req.workspaceId,
        demoBatchId: { $exists: false },
        status: 'failed',
      },
      { $set: { status: 'pending', attempts: 0, nextAttemptAt: new Date() } },
    );
    if (!result.matchedCount) throw new InputError('Only failed deliveries can be retried.', 409);
    res.json({ ok: true });
  });
}
