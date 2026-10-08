import { randomUUID } from 'node:crypto';
import {
  digest,
  publicOrigin,
  subscriptionMailer,
} from '@servicekraken/shared/status/subscriptions';
import { publicSnapshot, updateText } from '@servicekraken/shared/status/updates';
import { unseal } from '@servicekraken/shared/integrations/secrets';
import { sendEmail } from '../notifications/email.js';

/** Record an update through a recoverable pending snapshot; a crash cannot silently drop a transition. */
async function publish(db, page) {
  const now = new Date(),
    owner = randomUUID();
  await db
    .collection('publicStatusState')
    .updateOne(
      { _id: page._id },
      { $setOnInsert: { version: 0, snapshot: null } },
      { upsert: true },
    );
  const state = await db
    .collection('publicStatusState')
    .findOneAndUpdate(
      { _id: page._id, $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now } }] },
      { $set: { leaseUntil: new Date(+now + 60000), leaseOwner: owner } },
      { returnDocument: 'after' },
    );
  if (!state) return;
  const filter = { _id: page._id, leaseOwner: owner };
  try {
    if (!state.pending) {
      const monitors = await db
        .collection('monitors')
        .find(
          { userId: page._id },
          { projection: { serviceId: 1, paused: 1, lastCheck: 1, intervalMinutes: 1 } },
        )
        .toArray();
      const snapshot = publicSnapshot(page, monitors);
      if (
        JSON.stringify(snapshot) === JSON.stringify(state.snapshot) &&
        state.publicToken === page.publicToken
      )
        return;
      state.pending = {
        _id: digest(`${page._id}:${state.version + 1}`),
        workspaceId: page._id,
        publicToken: page.publicToken,
        sequence: state.version + 1,
        title: 'Service status updated',
        text: updateText(state.snapshot, snapshot),
        snapshot,
        createdAt: now,
        expiresAt: new Date(+now + 30 * 86400000),
        fanoutDone: false,
      };
      if (
        !(
          await db
            .collection('publicStatusState')
            .updateOne(filter, { $set: { pending: state.pending } })
        ).matchedCount
      )
        return;
    }
    const { snapshot, ...update } = state.pending;
    await db
      .collection('publicStatusUpdates')
      .updateOne({ _id: update._id }, { $setOnInsert: update }, { upsert: true });
    await db.collection('publicStatusState').updateOne(filter, {
      $set: { snapshot, version: update.sequence, publicToken: update.publicToken },
      $unset: { pending: '' },
    });
  } finally {
    await db
      .collection('publicStatusState')
      .updateOne(filter, { $unset: { leaseUntil: '', leaseOwner: '' } });
  }
}

/** Store only IDs in delivery jobs; subscribers are always rechecked immediately before sending. */
async function mailRecord(db, subscriber, kind, updateId = null) {
  const _id = digest(`${kind}:${subscriber._id}:${subscriber.generation}:${updateId ?? ''}`);
  const now = new Date();
  await db.collection('statusMail').updateOne(
    { _id },
    {
      $setOnInsert: {
        workspaceId: subscriber.workspaceId,
        subscriberId: subscriber._id,
        generation: subscriber.generation,
        kind,
        updateId,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: now,
        createdAt: now,
        expiresAt: new Date(+now + 7 * 86400000),
      },
    },
    { upsert: true },
  );
}

/** Reconcile public changes and bounded email batches; progress survives restarts and replica overlap. */
export async function reconcileStatusSubscriptions(db, queue) {
  for await (const page of db.collection('catalogs').find({ visibility: 'public' }))
    await publish(db, page);
  const now = new Date();
  // Rotate the scan so pending confirmations cannot starve newer requests.
  const pending = await db
    .collection('statusSubscribers')
    .find({ state: 'pending', expiresAt: { $gt: now }, confirmationQueued: { $ne: true } })
    .sort({ createdAt: 1 })
    .limit(200)
    .toArray();
  for (const subscriber of pending) {
    await mailRecord(db, subscriber, 'confirmation');
    await db
      .collection('statusSubscribers')
      .updateOne(
        { _id: subscriber._id, generation: subscriber.generation },
        { $set: { confirmationQueued: true } },
      );
  }
  const updates = await db
    .collection('publicStatusUpdates')
    .find({ fanoutDone: false, expiresAt: { $gt: now } })
    .sort({ createdAt: 1 })
    .limit(20)
    .toArray();
  for (const update of updates) {
    const page = await db.collection('catalogs').findOne({
      _id: update.workspaceId,
      publicToken: update.publicToken,
      visibility: 'public',
      emailSubscriptions: true,
      subscriptionsEnabled: { $ne: false },
    });
    if (!page) {
      await db
        .collection('publicStatusUpdates')
        .updateOne({ _id: update._id }, { $set: { fanoutDone: true } });
      continue;
    }
    const subscribers = await db
      .collection('statusSubscribers')
      .find({
        workspaceId: update.workspaceId,
        publicToken: update.publicToken,
        state: 'active',
        confirmedAt: { $lte: update.createdAt },
        ...(update.fanoutAfter ? { _id: { $gt: update.fanoutAfter } } : {}),
      })
      .sort({ _id: 1 })
      .limit(200)
      .toArray();
    for (const subscriber of subscribers) await mailRecord(db, subscriber, 'update', update._id);
    await db.collection('publicStatusUpdates').updateOne(
      {
        _id: update._id,
        ...(update.fanoutAfter
          ? { fanoutAfter: update.fanoutAfter }
          : { fanoutAfter: { $exists: false } }),
      },
      {
        $set: {
          fanoutDone: subscribers.length < 200,
          ...(subscribers.length ? { fanoutAfter: subscribers.at(-1)._id } : {}),
        },
      },
    );
  }
  for (const row of await db
    .collection('statusMail')
    .find({
      status: 'pending',
      expiresAt: { $gt: now },
      nextAttemptAt: { $lte: now },
      $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now } }],
    })
    .sort({ nextAttemptAt: 1 })
    .limit(200)
    .toArray()) {
    await queue.add(
      'status-email',
      { id: row._id },
      { jobId: row._id, attempts: 1, removeOnComplete: true, removeOnFail: 100 },
    );
  }
}

/** Deliver opt-in public emails with bounded retries and fresh visibility/configuration checks. */
export async function processStatusMail(db, id, send = sendEmail) {
  const now = new Date(),
    owner = randomUUID();
  const row = await db.collection('statusMail').findOneAndUpdate(
    {
      _id: id,
      status: 'pending',
      expiresAt: { $gt: now },
      nextAttemptAt: { $lte: now },
      $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now } }],
    },
    { $set: { leaseUntil: new Date(+now + 60000), leaseOwner: owner }, $inc: { attempts: 1 } },
    { returnDocument: 'after' },
  );
  if (!row) return;
  const filter = { _id: id, leaseOwner: owner };
  try {
    const subscriber = await db.collection('statusSubscribers').findOne({
      _id: row.subscriberId,
      workspaceId: row.workspaceId,
      generation: row.generation,
      state: row.kind === 'confirmation' ? 'pending' : 'active',
      ...(row.kind === 'confirmation' ? { expiresAt: { $gt: now } } : {}),
    });
    const page =
      subscriber &&
      (await db.collection('catalogs').findOne({
        _id: row.workspaceId,
        publicToken: subscriber.publicToken,
        visibility: 'public',
      }));
    const integration = page && (await subscriptionMailer(db, page));
    const update =
      row.kind === 'update' && page
        ? await db.collection('publicStatusUpdates').findOne({
            _id: row.updateId,
            workspaceId: page._id,
            publicToken: page.publicToken,
            expiresAt: { $gt: now },
          })
        : null;
    if (!subscriber || !page || !integration || (row.kind === 'update' && !update)) {
      await db.collection('statusMail').updateOne(filter, {
        $set: {
          status: 'skipped',
          error: 'Subscription or public email delivery is no longer available.',
        },
        $unset: { leaseUntil: '', leaseOwner: '' },
      });
      return;
    }
    const url = `${publicOrigin(page.publicOrigin || process.env.APP_ORIGIN || 'http://127.0.0.1:8090')}/status/public/${page.publicToken}`;
    const secret = unseal(subscriber.secrets);
    const unsubscribe = `${url}#unsubscribe=${secret.unsubscribe}`;
    const confirmation = row.kind === 'confirmation';
    const text = confirmation
      ? `Event: Confirm email subscription\nStatus page: ${url}\n\nConfirm: ${url}#confirm=${secret.confirm}\n\nThis link expires after 24 hours. If you did not request these emails, ignore this message or cancel using the link below.\n\nUnsubscribe: ${unsubscribe}`
      : `Event: Public status update\nUpdated: ${update.createdAt.toISOString()}\n\n${update.text}\n\nStatus page: ${url}\nUnsubscribe: ${unsubscribe}`;
    await send(integration, {
      to: [subscriber.email],
      subject: confirmation
        ? '[ServiceKraken] Confirm your status subscription'
        : '[ServiceKraken] Service status update',
      text,
      id: row._id,
    });
    await db.collection('statusMail').updateOne(filter, {
      $set: { status: 'sent', sentAt: new Date(), error: '' },
      $unset: { leaseUntil: '', leaseOwner: '' },
    });
  } catch {
    await db.collection('statusMail').updateOne(filter, {
      $set: {
        status: row.attempts >= 5 ? 'failed' : 'pending',
        error: 'Email delivery failed. Check the configured SMTP integration.',
        nextAttemptAt: new Date(Date.now() + 30000 * 2 ** (row.attempts - 1)),
      },
      $unset: { leaseUntil: '', leaseOwner: '' },
    });
  }
}
