import { ObjectId } from 'mongodb';

import { sendNotification } from './send.js';
/** Claim a durable delivery and retry failures with bounded exponential backoff. */
export async function processDelivery(db, key, send = sendNotification) {
  const now = new Date();
  const delivery = await db.collection('deliveries').findOneAndUpdate(
    {
      _id: key,
      demoBatchId: { $exists: false },
      status: 'pending',
      nextAttemptAt: { $lte: now },
      $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now } }],
    },
    { $set: { leaseUntil: new Date(+now + 60000) }, $inc: { attempts: 1 } },
    { returnDocument: 'after' },
  );
  if (!delivery) return;
  try {
    const config = await db.collection('operations').findOne({ _id: delivery.workspaceId });
    let integration = config?.integrations.find(
      (i) => i.id === delivery.integrationId && !i.demoBatchId && i.enabled,
    );
    if (delivery.event === 'comment') {
      const entry = await db.collection('incidentComments').findOne({
        _id: delivery.commentId,
        workspaceId: delivery.workspaceId,
        incidentId: delivery.incidentId,
        kind: 'comment',
      });
      const person = await db.collection('users').findOne({
        _id: new ObjectId(delivery.recipientId),
        disabled: { $ne: true },
        $or: [{ _id: delivery.workspaceId }, { workspaceId: delivery.workspaceId }],
      });
      const visible = await db.collection('incidents').findOne({
        _id: delivery.incidentId,
        workspaceId: delivery.workspaceId,
        ...(person?.role === 'user'
          ? {
              $or: [{ createdById: delivery.recipientId }, { openedForId: delivery.recipientId }],
            }
          : {}),
      });
      if (entry && person && visible) {
        const emailApp = config?.integrations.find(
          (item) =>
            item.type === 'email' && item.enabled && item.commentNotifications && !item.demoBatchId,
        );
        integration = emailApp
          ? { ...emailApp, onCall: false, recipients: [person.email] }
          : process.env.SMTP_HOST
            ? { type: 'email', recipients: [person.email] }
            : null;
        delivery.commentBody = entry.body;
        delivery.commentAuthor = entry.author;
      }
    }
    if (!integration) {
      await db.collection('deliveries').updateOne(
        { _id: key },
        {
          $set: { status: 'skipped', error: 'Integration disabled or removed.' },
          $unset: { leaseUntil: '' },
        },
      );
      return;
    }
    const incident = await db
      .collection('incidents')
      .findOne({ _id: delivery.incidentId, workspaceId: delivery.workspaceId });
    if (!incident) throw new Error('Incident is unavailable.');
    if (
      delivery.event !== 'comment' &&
      ((delivery.resolutionCycle ?? 0) !== (incident.resolutionCycle ?? 0) ||
        (delivery.event === 'recovered' && incident.status !== 'resolved'))
    ) {
      await db.collection('deliveries').updateOne(
        { _id: key },
        {
          $set: { status: 'skipped', error: 'Incident state changed before delivery.' },
          $unset: { leaseUntil: '' },
        },
      );
      return;
    }
    const person = delivery.onCallUserId
      ? await db.collection('users').findOne({
          _id: new ObjectId(delivery.onCallUserId),
          disabled: { $ne: true },
          $or: [{ _id: delivery.workspaceId }, { workspaceId: delivery.workspaceId }],
        })
      : null;
    if (['github', 'jira'].includes(integration.type)) {
      const previous = await db.collection('deliveries').findOne({
        workspaceId: delivery.workspaceId,
        integrationId: delivery.integrationId,
        incidentId: delivery.incidentId,
        status: 'sent',
        externalId: { $ne: null },
      });
      if (previous?.externalId) delivery.externalId = previous.externalId;
    }
    const result = await send(integration, incident, delivery, person?.email);
    await db.collection('deliveries').updateOne(
      { _id: key },
      {
        $set: {
          status: 'sent',
          sentAt: new Date(),
          externalId: result.externalId ?? null,
          error: '',
        },
        $unset: { leaseUntil: '' },
      },
    );
  } catch (error) {
    // Never persist raw provider responses, webhook URLs, or SMTP authentication diagnostics.
    const safe = /^Provider returned HTTP \d{3}\.$/.test(error.message)
      ? error.message
      : 'Delivery failed. Check provider credentials, permissions, TLS, and network settings.';
    await db.collection('deliveries').updateOne(
      { _id: key },
      {
        $set: {
          status: delivery.attempts >= 5 ? 'failed' : 'pending',
          error: safe,
          nextAttemptAt: new Date(Date.now() + 30000 * 2 ** (delivery.attempts - 1)),
        },
        $unset: { leaseUntil: '' },
      },
    );
  }
}
