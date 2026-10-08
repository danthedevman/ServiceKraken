import { InputError } from '@servicekraken/shared/validation/validation';

/** Serve only normalized raster branding, rechecking public visibility on every request. */
export async function sendStatusIcon(db, workspaceId, res) {
  const icon = await db.collection('statusIcons').findOne({ _id: workspaceId });
  if (!icon) throw new InputError('Icon not found.', 404);
  res
    .set('Cache-Control', 'no-store')
    .set('X-Content-Type-Options', 'nosniff')
    .type('image/png')
    .send(Buffer.from(icon.base64, 'base64'));
}

/** Admin-only settings middleware protects these routes; one icon replaces the previous image. */
export function installStatusIconRoutes(app, db) {
  app.get('/api/status-settings/icon', async (req, res) =>
    sendStatusIcon(db, req.workspaceId, res),
  );
  app.post('/api/status-settings/icon', async (req, res) => {
    const value = req.body?.base64;
    if (typeof value !== 'string' || value.length > 140000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value))
      throw new InputError('Upload a PNG icon up to 100 KB.');
    const bytes = Buffer.from(value, 'base64');
    if (
      bytes.length < 33 ||
      bytes.length > 102400 ||
      !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      bytes.subarray(12, 16).toString() !== 'IHDR' ||
      bytes.readUInt32BE(16) < 1 ||
      bytes.readUInt32BE(20) < 1 ||
      bytes.readUInt32BE(16) > 256 ||
      bytes.readUInt32BE(20) > 256
    )
      throw new InputError('Use a PNG icon no larger than 256 × 256 pixels and 100 KB.');
    await db.collection('statusIcons').updateOne(
      { _id: req.workspaceId },
      {
        $set: {
          base64: bytes.toString('base64'),
          updatedAt: new Date(),
          updatedById: String(req.user._id),
        },
      },
      { upsert: true },
    );
    res.json({ ok: true });
  });
  app.delete('/api/status-settings/icon', async (req, res) => {
    await db.collection('statusIcons').deleteOne({ _id: req.workspaceId });
    res.status(204).end();
  });
}
