/** Remove unreferenced uploads after 24 hours; a concurrent claim refreshes lastLinkedAt atomically. */
export async function cleanupAttachments(db, now = new Date()) {
  const cutoff = new Date(+now - 86400000),
    names = { incidents: 'incidents', tasks: 'tasks', knowledge: 'articles' };
  const rows = db
    .collection('attachments')
    .find({ lastLinkedAt: { $lt: cutoff } }, { projection: { data: 0 } })
    .sort({ lastLinkedAt: 1 })
    .limit(100);
  for await (const file of rows) {
    const referenced = await db
      .collection(names[file.kind])
      .findOne(
        { workspaceId: file.workspaceId, attachmentIds: String(file._id) },
        { projection: { _id: 1 } },
      );
    if (!referenced)
      await db
        .collection('attachments')
        .deleteOne({ _id: file._id, lastLinkedAt: { $lt: cutoff } });
    else
      await db
        .collection('attachments')
        .updateOne({ _id: file._id }, { $set: { lastLinkedAt: now } });
  }
}
