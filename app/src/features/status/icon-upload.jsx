import React, { useState } from 'react';
import { writeApi } from '../../data/query-client.js';

/** Re-encode uploaded raster images to a small PNG, removing metadata before upload. */
async function normalizeIcon(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024)
    throw new Error('Choose a PNG, JPEG, or WebP image up to 2 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 16000000)
      throw new Error('Choose an image under 16 megapixels.');
    const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    if (base64.length > 136536)
      throw new Error('Choose a simpler image; the resized icon must be under 100 KB.');
    return base64;
  } finally {
    bitmap.close();
  }
}

/** Branding is saved explicitly and independently from visibility and announcement drafts. */
export function StatusIconUpload({ hasIcon }) {
  const [present, setPresent] = useState(hasIcon);
  const [version, setVersion] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function change(file) {
    setBusy(true);
    setError('');
    try {
      if (file)
        await writeApi('/status-settings/icon', {
          method: 'POST',
          body: { base64: await normalizeIcon(file) },
        });
      else await writeApi('/status-settings/icon', { method: 'DELETE' });
      setPresent(!!file);
      setVersion(Date.now());
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Status page icon</h2>
      {present && (
        <img
          src={`/api/status-settings/icon?v=${version}`}
          alt="Current status page icon"
          className="h-16 w-16 object-contain"
        />
      )}
      <label className="field-label">
        Upload icon
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void change(file);
            event.target.value = '';
          }}
        />
      </label>
      <p className="text-sm text-slate-500">
        PNG, JPEG, or WebP up to 2 MB. Resized to 256 pixels. Uploading or removing saves
        immediately and updates public branding when the page is public.
      </p>
      {present && (
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => change(null)}
        >
          Use default icon
        </button>
      )}
      {busy && <p role="status">Updating icon…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
