import { InputError } from '@servicekraken/shared/validation/validation';

import { BUILTIN_FIELDS } from '@servicekraken/shared/forms/schema';

/** A bounded settings document gives schedules and form edits optimistic concurrency. */
export async function settings(db, workspaceId) {
  await db
    .collection('operations')
    .updateOne(
      { _id: workspaceId },
      { $setOnInsert: { revision: 0, fields: BUILTIN_FIELDS, shifts: [], integrations: [] } },
      { upsert: true },
    );
  let data = await db.collection('operations').findOne({ _id: workspaceId });
  const missing = BUILTIN_FIELDS.filter(
    (field) => !data.fields.some((saved) => saved.id === field.id),
  );
  if (missing.length) {
    await db
      .collection('operations')
      .updateOne(
        { _id: workspaceId, revision: data.revision },
        { $push: { fields: { $each: missing } }, $inc: { revision: 1 } },
      );
    data = await db.collection('operations').findOne({ _id: workspaceId });
  }
  // Present the previous built-in label consistently while retaining custom labels.
  data.fields = data.fields.map((field) =>
    field.id === 'knowledgeIds' && field.label === 'Knowledge articles'
      ? { ...field, label: 'Knowledge' }
      : field,
  );
  return data;
}

/** Save with compare-and-swap, never silently overwrite another administrator. */
export async function save(db, data, revision, changes) {
  if (!Number.isInteger(revision) || revision !== data.revision)
    throw new InputError('Settings changed. Refresh before saving again.', 409);
  const result = await db
    .collection('operations')
    .updateOne({ _id: data._id, revision }, { $set: changes, $inc: { revision: 1 } });
  if (!result.matchedCount)
    throw new InputError('Settings changed. Refresh before saving again.', 409);
}
