import { userDetails } from '@servicetrident/shared/domain/user-details';
import { auditStamp } from '@servicetrident/shared/domain/audit';
import { uiPreferences, preferencePatch } from '@servicetrident/shared/domain/ui-preferences';

import { fieldErrors } from '@servicetrident/shared/validation/form-validation';

import { InputError } from '@servicetrident/shared/validation/validation';
import {
  clearSessionCookie,
  createSession,
  digestToken,
  hashPassword,
  sessionToken,
  verifyPassword,
  serializeUser,
  serializeSessionUser,
} from '../auth/auth.js';

/** Register authenticated account routes; authentication and workspace policy run in app.js. */
export function installAccountRoutes(app, db, authLimit) {
  app.patch('/api/auth/details', async (req, res) => {
    const current = await db.collection('users').findOne({ _id: req.user._id });
    const details = userDetails(req.body ?? {}, current);
    await db
      .collection('users')
      .updateOne({ _id: req.user._id }, { $set: { ...details, ...auditStamp(current, req.user) } });
    res.json({ ok: true });
  });
  app.get('/api/auth/me', (req, res) => res.json({ user: serializeSessionUser(req) }));
  /** Layout changes belong to the real signed-in user, including during role preview. */
  app.patch('/api/auth/preferences', async (req, res) => {
    const patch = preferencePatch(req.body);
    const update = Object.fromEntries(
      Object.entries(patch).map(([key, value]) => [`uiPreferences.${key}`, value]),
    );
    const user = await db
      .collection('users')
      .findOneAndUpdate(
        { _id: req.user._id },
        { $set: update },
        { returnDocument: 'after', projection: { uiPreferences: 1 } },
      );
    res.json({ preferences: uiPreferences(user?.uiPreferences) });
  });
  // Only the account's real role can enter or exit a session-scoped role preview.
  app.post('/api/auth/role', async (req, res) => {
    if (req.actualRole !== 'admin')
      throw new InputError('Workspace admin access is required.', 403);
    const role = req.body?.role;
    if (!['admin', 'responder', 'viewer', 'user'].includes(role))
      throw new InputError('Choose Admin, Responder, Viewer, or User.');
    await db.collection('sessions').updateOne({ _id: req.sessionId }, { $set: { viewRole: role } });
    req.role = role;
    res.json({ user: serializeSessionUser(req) });
  });
  /** Require password confirmation, limit attempts, and invalidate other sessions on account edits. */
  app.patch('/api/auth/profile', authLimit, async (req, res) => {
    const input = req.body ?? {};
    const fields = fieldErrors('profile', input);
    if (Object.keys(fields).length)
      throw new InputError('Check the highlighted profile fields.', 400, fields);
    const account = await db.collection('users').findOne({ _id: req.user._id });
    if (!account || !(await verifyPassword(input.currentPassword, account.passwordHash))) {
      throw new InputError('Current password is incorrect.', 400, {
        currentPassword: 'Current password is incorrect.',
      });
    }
    const email = input.email.trim().toLowerCase();
    const displayName = (input.displayName ?? account.displayName ?? '').trim();
    const passwordHash = input.newPassword
      ? await hashPassword(input.newPassword)
      : account.passwordHash;
    try {
      const result = await db
        .collection('users')
        .updateOne(
          { _id: account._id, passwordHash: account.passwordHash, email: account.email },
          { $set: { ...auditStamp(account, req.user), email, displayName, passwordHash } },
        );
      if (!result.matchedCount)
        throw new InputError('Your profile changed in another session. Reload and try again.', 409);
    } catch (error) {
      if (error.code === 11000)
        throw new InputError('This email address is already in use.', 409, {
          email: 'This email address is already in use.',
        });
      throw error;
    }
    await db.collection('sessions').deleteMany({ userId: account._id });
    await createSession(db, res, account._id);
    res.json({ user: serializeUser({ ...account, email, displayName }) });
  });
  app.post('/api/auth/logout', async (req, res) => {
    await db.collection('sessions').deleteOne({ _id: digestToken(sessionToken(req)) });
    clearSessionCookie(res);
    res.status(204).end();
  });
}
