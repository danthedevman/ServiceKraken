import { randomBytes } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { InputError } from '@servicekraken/shared/validation/input-error';
import {
  digest,
  publicOrigin,
  subscriberEmail,
  subscriptionMailer,
} from '@servicekraken/shared/status/subscriptions';
import { rssFeed } from '@servicekraken/shared/status/updates';
import { seal } from '@servicekraken/shared/integrations/secrets';
import { isAllowedOrigin } from '../middleware/origin.js';

/** Public subscription endpoints have their own strict origin policy for a configured status domain. */
export function installStatusSubscriptions(app, db, appOrigin) {
  const path = '/api/public/status/:token';
  const findPage = async (token, publicOnly = true) => {
    if (!/^[a-f\d]{48}$/.test(token)) throw new InputError('Status page not found.', 404);
    const page = await db
      .collection('catalogs')
      .findOne({ publicToken: token, ...(publicOnly ? { visibility: 'public' } : {}) });
    if (!page) throw new InputError('Status page not found.', 404);
    return page;
  };
  app.get(`${path}/feed.xml`, async (req, res) => {
    const page = await findPage(req.params.token);
    if (page.subscriptionButtonVisible === false || page.rssSubscriptions === false)
      throw new InputError('RSS subscriptions are not available.', 404);
    const updates = await db
      .collection('publicStatusUpdates')
      .find({
        workspaceId: page._id,
        publicToken: page.publicToken,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1, _id: -1 })
      .limit(50)
      .toArray();
    const url = `${publicOrigin(page.publicOrigin || appOrigin)}/status/public/${page.publicToken}`;
    res.type('application/rss+xml').send(rssFeed(url, updates));
  });
  app.use(`${path}/subscriptions`, async (req, res, next) => {
    const page = await findPage(req.params.token, false);
    if (req.method === 'POST') {
      const origin = req.get('origin');
      if (
        req.get('x-requested-with') !== 'ServiceTrident' ||
        (origin &&
          ![appOrigin, page.publicOrigin || appOrigin].some((allowed) =>
            isAllowedOrigin(origin, allowed),
          ))
      )
        throw new InputError('This address is not allowed to manage subscriptions.', 403);
      if (!req.is('application/json'))
        throw new InputError('Send an application/json request.', 415);
    }
    req.statusPage = page;
    next();
  });
  const ipLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 6,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many subscription requests. Try again in 15 minutes.' },
  });
  const pageLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 100,
    keyGenerator: (req) => req.params.token,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Subscriptions are busy. Try again later.' },
  });
  app.post(`${path}/subscriptions`, ipLimit, pageLimit, async (req, res) => {
    const page = req.statusPage;
    if (page.visibility !== 'public') throw new InputError('Status page not found.', 404);
    if (!(await subscriptionMailer(db, page)))
      throw new InputError('Email subscriptions are not available.', 409);
    const email = subscriberEmail(req.body?.email);
    if (req.body?.consent !== true)
      throw new InputError('Confirm that you want to receive status emails.', 400, {
        consent: 'Consent is required.',
      });
    const now = new Date(),
      confirm = randomBytes(32).toString('hex'),
      unsubscribe = randomBytes(32).toString('hex');
    const _id = digest(`${page._id}:${email}`);
    // One pending confirmation per address for 24 hours; repeated requests never send another email.
    await db.collection('statusSubscribers').updateOne(
      { _id },
      {
        $setOnInsert: {
          workspaceId: page._id,
          publicToken: page.publicToken,
          email,
          state: 'pending',
          createdAt: now,
          confirmationHash: digest(confirm),
          unsubscribeHash: digest(unsubscribe),
          secrets: seal({ confirm, unsubscribe }),
          generation: randomBytes(16).toString('hex'),
          expiresAt: new Date(+now + 86400000),
        },
      },
      { upsert: true },
    );
    res.status(202).json({
      message:
        'If this address needs confirmation, you will receive an email shortly. Check your inbox and spam folder.',
    });
  });
  app.post(`${path}/subscriptions/confirm`, async (req, res) => {
    const page = req.statusPage,
      token = req.body?.token;
    if (typeof token !== 'string' || !/^[a-f\d]{64}$/.test(token))
      throw new InputError('Invalid confirmation link.', 400);
    if (page.visibility !== 'public' || !(await subscriptionMailer(db, page)))
      throw new InputError('Email subscriptions are not available.', 409);
    const result = await db.collection('statusSubscribers').updateOne(
      {
        workspaceId: page._id,
        publicToken: page.publicToken,
        state: 'pending',
        confirmationHash: digest(token),
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { state: 'active', confirmedAt: new Date() },
        $unset: { expiresAt: '', confirmationHash: '' },
      },
    );
    if (!result.matchedCount)
      throw new InputError('This confirmation link has expired or was already used.', 400);
    res.json({ message: 'Subscription confirmed. You will receive future public status updates.' });
  });
  app.post(`${path}/subscriptions/unsubscribe`, async (req, res) => {
    const token = req.body?.token;
    if (typeof token !== 'string' || !/^[a-f\d]{64}$/.test(token))
      throw new InputError('Invalid unsubscribe link.', 400);
    // Unsubscribe stays available while the page is private or its email integration is disabled.
    await db.collection('statusSubscribers').deleteOne({
      workspaceId: req.statusPage._id,
      publicToken: req.statusPage.publicToken,
      unsubscribeHash: digest(token),
    });
    res.json({ message: 'You are unsubscribed from email updates.' });
  });
}
