import { userDetails, userDetailView } from '@servicekraken/shared/domain/user-details';
import { auditStamp, auditFields } from '@servicekraken/shared/domain/audit';

import { randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';

import { InputError } from '@servicekraken/shared/validation/validation';
import { text, choice, identifier, invalid } from '@servicekraken/shared/validation/fields';

import { id } from './services.js';
import { requireAdmin, digestToken, serializeUser } from '../auth/auth.js';

import { memberFilter } from '../repositories/members.js';
import { members } from '../repositories/members.js';

/** Register workspace routes; authentication and workspace policy run in app.js. */
export function installWorkspaceRoutes(app, db, appOrigin) {
  app.get('/api/members', async (req, res) =>
    res.json({
      members: (await members(db, req.workspaceId))
        .filter((u) => req.role !== 'user' || String(u._id) === String(req.user._id))
        .map((u) => ({
          ...serializeUser(u),
          ...userDetailView(u),
          uiPreferences: undefined,
          ...auditFields(u),
          disabled: u.disabled === true,
          owner: String(u._id) === String(req.workspaceId),
        })),
    }),
  );
  app.get('/api/invitations', requireAdmin, async (req, res) => {
    const rows = await db
      .collection('invitations')
      .find({ workspaceId: req.workspaceId, expiresAt: { $gt: new Date() } })
      .toArray();
    res.json({
      invitations: rows.map(({ inviteId, email, displayName, role, expiresAt }) => ({
        id: inviteId,
        email,
        displayName,
        role,
        expiresAt,
      })),
    });
  });
  app.post('/api/invitations', requireAdmin, async (req, res) => {
    const email = text(req.body.email, 'email', 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalid('email', 'Enter a valid email address.');
    const displayName = text(req.body.displayName, 'displayName', 80);
    const role = choice(req.body.role, ['admin', 'responder', 'user', 'viewer'], 'role');
    if (await db.collection('users').findOne({ email }))
      invalid(
        'email',
        'This email already has an account. Existing workspaces cannot be merged by invitation.',
      );
    if (
      (await db
        .collection('invitations')
        .countDocuments({ workspaceId: req.workspaceId, demoBatchId: { $exists: false } })) +
        (await db
          .collection('users')
          .countDocuments({ ...memberFilter(req.workspaceId), demoBatchId: { $exists: false } })) >=
      100
    )
      throw new InputError('A workspace supports up to 100 members and pending invitations.', 409);
    const token = randomBytes(32).toString('hex'),
      inviteId = new ObjectId().toHexString();
    await db.collection('invitations').deleteMany({ workspaceId: req.workspaceId, email });
    await db.collection('invitations').insertOne({
      _id: digestToken(token),
      inviteId,
      workspaceId: req.workspaceId,
      email,
      displayName,
      role,
      ...auditStamp(null, req.user),
      expiresAt: new Date(Date.now() + 48 * 3600000),
    });
    res.status(201).json({ inviteUrl: `${appOrigin}/join/${token}` });
  });
  app.delete('/api/invitations/:id', requireAdmin, async (req, res) => {
    await db
      .collection('invitations')
      .deleteOne({ inviteId: identifier(req.params.id), workspaceId: req.workspaceId });
    res.status(204).end();
  });
  app.delete('/api/members/:id', requireAdmin, async (req, res) => {
    const userId = id(req.params.id);
    if (String(userId) === String(req.workspaceId) || String(userId) === String(req.user._id))
      throw new InputError('You cannot delete yourself or the workspace owner.', 409);
    const current = await db
      .collection('users')
      .findOne({ ...memberFilter(req.workspaceId), _id: userId });
    if (!current) throw new InputError('Teammate not found.', 404);
    const assigned = await db.collection('catalogs').findOne({
      _id: req.workspaceId,
      $or: [{ 'services.ownerIds': req.params.id }, { 'services.primaryContactId': req.params.id }],
    });
    const scheduled = await db.collection('operations').findOne({
      _id: req.workspaceId,
      $or: [{ 'shifts.userId': req.params.id }, { 'groups.memberIds': req.params.id }],
    });
    if (assigned || scheduled)
      throw new InputError(
        'Remove service ownership, group membership, and on-call coverage before deleting this teammate.',
        409,
      );
    await db.collection('users').deleteOne({ ...memberFilter(req.workspaceId), _id: userId });
    await db.collection('sessions').deleteMany({ userId });
    res.status(204).end();
  });
  app.patch('/api/members/:id', requireAdmin, async (req, res) => {
    const userId = id(req.params.id);
    if (
      String(userId) === String(req.workspaceId) &&
      (req.body.role !== 'admin' || req.body.disabled !== false)
    )
      throw new InputError('The workspace owner must remain an active admin.', 409);
    const displayName = text(req.body.displayName, 'displayName', 80);
    const role = choice(req.body.role, ['admin', 'responder', 'user', 'viewer'], 'role');
    if (typeof req.body.disabled !== 'boolean')
      invalid('disabled', 'Choose whether this account is active.');
    const current = await db
      .collection('users')
      .findOne({ ...memberFilter(req.workspaceId), _id: userId });
    if (!current) throw new InputError('Teammate not found.', 404);
    if (current.demoBatchId && req.body.disabled !== true)
      invalid('disabled', 'Demo users cannot sign in.');
    const result = await db.collection('users').updateOne(
      { ...memberFilter(req.workspaceId), _id: userId },
      {
        $set: {
          ...auditStamp(current, req.user),
          ...userDetails(req.body, current),
          displayName,
          role,
          disabled: req.body.disabled,
        },
      },
    );
    if (!result.matchedCount) throw new InputError('Teammate not found.', 404);
    await db.collection('sessions').deleteMany({ userId });
    res.json({ ok: true });
  });
}
