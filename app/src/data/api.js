/** Make same-origin JSON requests; session tokens stay in HttpOnly cookies.
 * @param {string} path @param {RequestInit & {body?: any}} [options] @returns {Promise<any>}
 */
export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type':
        options.body instanceof Blob ? 'application/octet-stream' : 'application/json',
      'X-Requested-With': 'ServiceKraken',
      ...options.headers,
    },
    body:
      options.body === undefined
        ? undefined
        : options.body instanceof Blob
          ? options.body
          : JSON.stringify(options.body),
  });
  if (response.status === 204) return null;
  const data = await response
    .json()
    .catch(() => ({ error: 'The server could not be reached. Please try again.' }));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('session-expired'));
    const error = new Error(data.error ?? 'Request failed.');
    error.fields = data.fields ?? {};
    throw error;
  }
  return data;
}
