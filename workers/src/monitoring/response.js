export const BODY_LIMIT = 16 * 1024;

/** Remove credential-bearing response headers before storage.
 * @param {Record<string, string | string[] | undefined>} headers @returns {object}
 */
export function redactHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      /cookie|authorization|token|secret|api[-_]?key/i.test(name) ? '[redacted]' : value,
    ]),
  );
}

/** Capture a bounded text preview without rendering, decompressing, or buffering large bodies.
 * @param {import('node:http').IncomingMessage} response @param {AbortSignal} signal
 * @param {object} snapshot Response metadata, updated with the captured body.
 * @returns {Promise<object>}
 */
export function captureBody(response, signal, snapshot) {
  const body = (snapshot.body = {
    text: '',
    bytesCaptured: 0,
    truncated: false,
    omitted: null,
    error: null,
  });
  const contentType = String(response.headers['content-type'] ?? '').toLowerCase();
  const encoding = String(response.headers['content-encoding'] ?? 'identity').toLowerCase();
  if (encoding !== 'identity') body.omitted = `Encoded body (${encoding}) was not captured.`;
  else if (
    !/^(text\/|application\/(json|[^;]+\+json|xml|[^;]+\+xml|javascript|x-www-form-urlencoded)(;|$))/.test(
      contentType,
    )
  ) {
    body.omitted = 'Binary or unspecified content type; body was not captured.';
  }
  if (body.omitted) {
    response.destroy();
    return Promise.resolve(snapshot);
  }
  return new Promise((resolve) => {
    const chunks = [];
    let finished = false;
    const finish = (error = null) => {
      if (finished) return;
      finished = true;
      signal.removeEventListener('abort', onAbort);
      body.error = error;
      body.text = Buffer.concat(chunks).toString('utf8');
      resolve(snapshot);
      response.destroy();
    };
    const onAbort = () => finish('Body capture timed out.');
    response.on('data', (chunk) => {
      if (finished) return;
      const remaining = BODY_LIMIT - body.bytesCaptured;
      const part = Buffer.from(chunk.subarray(0, remaining));
      chunks.push(part);
      body.bytesCaptured += part.length;
      if (chunk.length > remaining) {
        body.truncated = true;
        finish();
      }
    });
    response.once('end', () => finish());
    response.once('aborted', () => finish('Response body was interrupted.'));
    response.once('error', () => finish('Response body could not be read.'));
    response.once('close', () => finish('Response closed before the body completed.'));
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}
