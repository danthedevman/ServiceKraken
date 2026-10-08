import { auditStamp, auditFields } from '@servicekraken/shared/domain/audit';

import { invalid } from '@servicekraken/shared/validation/fields';

import { validateShifts } from '@servicekraken/shared/domain/on-call';

import { catalog } from './services.js';
import { requireAdmin } from '../auth/auth.js';
import { settings } from '../repositories/settings.js';
import { save } from '../repositories/settings.js';

import { members } from '../repositories/members.js';

/** Register on-call routes; authentication and workspace policy run in app.js. */
export function installOnCallRoutes(app, db, appOrigin) {
  app.get('/api/on-call', async (req, res) => {
    const data = await settings(db, req.workspaceId);
    res.json({ shifts: data.shifts, revision: data.revision });
  });
  app.put('/api/on-call', requireAdmin, async (req, res) => {
    const data = await settings(db, req.workspaceId);
    const people = (await members(db, req.workspaceId))
      .filter((u) => !u.disabled)
      .map((u) => String(u._id));
    const serviceIds = (await catalog(db, req.workspaceId)).services.map((s) => s.id);
    // Retain unchanged historical shifts if a teammate was disabled or a service deleted.
    const sameShift = (a, b) =>
      a.id === b.id &&
      a.userId === b.userId &&
      a.start === b.start &&
      a.end === b.end &&
      JSON.stringify(a.serviceIds) === JSON.stringify(b.serviceIds);
    const unchanged = (Array.isArray(req.body.shifts) ? req.body.shifts : []).filter(
      (s) => s && data.shifts.some((old) => sameShift(old, s)),
    );
    const allowedPeople = [...new Set([...people, ...unchanged.map((s) => s.userId)])];
    const allowedServices = [
      ...new Set([...serviceIds, ...unchanged.flatMap((s) => s.serviceIds)]),
    ];
    const shifts = validateShifts(req.body.shifts, allowedPeople, allowedServices);
    for (const shift of shifts)
      if (
        !unchanged.some((s) => s.id === shift.id) &&
        (!people.includes(shift.userId) || shift.serviceIds.some((id) => !serviceIds.includes(id)))
      )
        invalid(
          'shifts',
          'New or changed shifts must use active teammates and available services.',
        );
    await save(db, data, req.body.revision, {
      shifts: shifts.map((shift) => {
        const previous = data.shifts.find((row) => row.id === shift.id);
        return {
          ...shift,
          ...(previous && sameShift(previous, shift)
            ? auditFields(previous)
            : auditStamp(previous, req.user)),
        };
      }),
    });
    res.locals.auditChanges = [
      ...shifts
        .filter((shift) => !unchanged.some((row) => row.id === shift.id))
        .map((shift) => ({
          id: shift.id,
          action: data.shifts.some((row) => row.id === shift.id) ? 'update' : 'create',
        })),
      ...data.shifts
        .filter((shift) => !shifts.some((row) => row.id === shift.id))
        .map((shift) => ({ id: shift.id, action: 'delete' })),
    ];
    res.json({ ok: true });
  });
}
