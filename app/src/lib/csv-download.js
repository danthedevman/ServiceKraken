/** Download a CSV blob without opening untrusted content or leaking object URLs. */
export function saveCsv(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Fetch an authenticated export without putting private CSV content into the query cache. */
export async function downloadCsv(path, filename, signal) {
  const response = await fetch(`/api${path}`, { credentials: 'same-origin', signal });
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('session-expired'));
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'Could not export this table. Please try again.');
  }
  const blob = await response.blob();
  if (!signal?.aborted) saveCsv(blob, filename);
}
