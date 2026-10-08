import { auditStamp } from '@servicekraken/shared/domain/audit';

import { ObjectId } from 'mongodb';

import { InputError } from '@servicekraken/shared/validation/validation';
import { text, invalid } from '@servicekraken/shared/validation/fields';

import { requireAdmin } from '../auth/auth.js';
import { settings } from '../repositories/settings.js';
import { save } from '../repositories/settings.js';

import { members } from '../repositories/members.js';

/** Register groups routes; authentication and workspace policy run in app.js. */
export function installGroupsRoutes(app, db, appOrigin) {
  app.get('/api/groups', async (req, res) => {
    const data = await settings(db, req.workspaceId);
    res.json({ groups: data.groups ?? [], revision: data.revision });
  });
  for (const method of ['post', 'patch'])
    app[method](
      `/api/groups${method === 'patch' ? '/:id' : ''}`,
      requireAdmin,
      async (req, res) => {
        const data = await settings(db, req.workspaceId),
          groups = data.groups ?? [];
        const current = method === 'patch' ? groups.find((g) => g.id === req.params.id) : null;
        if (method === 'patch' && !current) throw new InputError('Group not found.', 404);
        if (!current && groups.filter((group) => !group.demoBatchId).length >= 100)
          throw new InputError('Use at most 100 groups per workspace.', 409);
        const available = (await members(db, req.workspaceId)).map((u) => String(u._id));
        const memberIds = req.body.memberIds;
        if (
          !Array.isArray(memberIds) ||
          memberIds.length > 100 ||
          new Set(memberIds).size !== memberIds.length ||
          memberIds.some((value) => typeof value !== 'string' || !available.includes(value))
        )
          invalid('memberIds', 'Choose workspace members without duplicates.');
        const group = {
          ...auditStamp(current, req.user),
          id: current?.id ?? new ObjectId().toHexString(),
          name: text(req.body.name, 'name', 80),
          description: text(req.body.description ?? '', 'description', 1000, false),
          memberIds,
        };
        if (
          groups.some((g) => g.id !== group.id && g.name.toLowerCase() === group.name.toLowerCase())
        )
          invalid('name', 'A group already uses this name.');
        await save(db, data, req.body.revision, {
          groups: current ? groups.map((g) => (g.id === group.id ? group : g)) : [...groups, group],
        });
        res.status(current ? 200 : 201).json({ group });
      },
    );
}
