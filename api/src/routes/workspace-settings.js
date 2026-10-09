import { requireAdmin } from '../auth/auth.js';
import { InputError } from '@servicetrident/shared/validation/input-error';
import {
  workspaceSettings,
  workspaceSettingsErrors,
} from '@servicetrident/shared/domain/workspace-settings';

/** Settings live on the quota owner's document so monitor creation and limit changes are atomic. */
export function installWorkspaceSettings(app, db) {
  app.get('/api/settings/workspace', requireAdmin, async (req, res) => {
    const owner = await db
      .collection('users')
      .findOne(
        { _id: req.workspaceId },
        { projection: { workspaceSettings: 1, settingsRevision: 1, monitorCount: 1 } },
      );
    res.json({
      settings: workspaceSettings(owner?.workspaceSettings),
      revision: owner?.settingsRevision ?? 0,
      monitorCount: owner?.monitorCount ?? 0,
    });
  });
  app.put('/api/settings/workspace', requireAdmin, async (req, res) => {
    const { settings, revision } = req.body ?? {};
    const errors = workspaceSettingsErrors(settings);
    if (!Number.isSafeInteger(revision) || revision < 0)
      errors.revision = 'Refresh settings before saving.';
    if (Object.keys(errors).length)
      throw new InputError('Check the highlighted settings.', 400, errors);
    const owner = await db.collection('users').findOneAndUpdate(
      {
        _id: req.workspaceId,
        $expr: { $eq: [{ $ifNull: ['$settingsRevision', 0] }, revision] },
        monitorCount: { $lte: settings.monitorLimit },
      },
      { $set: { workspaceSettings: workspaceSettings(settings) }, $inc: { settingsRevision: 1 } },
      {
        returnDocument: 'after',
        projection: { workspaceSettings: 1, settingsRevision: 1, monitorCount: 1 },
      },
    );
    if (!owner)
      throw new InputError(
        'Settings changed or the limit is below current monitor usage. Refresh and try again.',
        409,
      );
    res.json({
      settings: workspaceSettings(owner.workspaceSettings),
      revision: owner.settingsRevision,
      monitorCount: owner.monitorCount,
    });
  });
}
