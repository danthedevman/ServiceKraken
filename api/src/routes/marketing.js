import { requireAdmin } from '../auth/auth.js';
import { InputError } from '@servicetrident/shared/validation/input-error';

/** Marketing inquiries belong to the deployment operator, never to every tenant's administrator. */
export function installMarketingInbox(app, db) {
  const allowed = (req) =>
    !!process.env.MARKETING_OWNER_EMAIL &&
    req.actualRole === 'admin' &&
    req.user.email.toLowerCase() === process.env.MARKETING_OWNER_EMAIL.trim().toLowerCase();
  app.get('/api/settings/marketing', requireAdmin, (req, res) =>
    res.json({ available: allowed(req) }),
  );
  app.use('/api/settings/marketing/inquiries', requireAdmin, (req, res, next) => {
    if (!allowed(req))
      throw new InputError('The marketing inbox is restricted to its configured owner.', 403);
    next();
  });
  app.get('/api/settings/marketing/inquiries', async (req, res) => {
    const rows = await db
      .collection('marketingInquiries')
      .find({ expiresAt: { $gt: new Date() } }, { projection: { consent: 0 } })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();
    res.json({ inquiries: rows.map(({ _id, ...row }) => ({ id: _id, ...row })) });
  });
  app.delete('/api/settings/marketing/inquiries/:id', async (req, res) => {
    if (!/^[a-f\d]{64}$/.test(req.params.id)) throw new InputError('Invalid inquiry identifier.');
    await db.collection('marketingInquiries').deleteOne({ _id: req.params.id });
    res.status(204).end();
  });
}
