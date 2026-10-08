import { notify } from './toast.js';
/** Make same-origin JSON requests; session tokens stay in HttpOnly cookies.
 * @param {string} path @param {RequestInit & {body?: any}} [options] @returns {Promise<any>}
 */
export async function api(path, options = {}) {
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes((options.method ?? 'GET').toUpperCase());
  const announce = mutation && options.toast !== false && path !== '/auth/preferences';
  try {
    const result = await request(path, options);
    if (announce)
      notify(
        result?.message ||
          (options.method?.toUpperCase() === 'DELETE'
            ? 'Deleted successfully.'
            : 'Changes saved successfully.'),
      );
    return result;
  } catch (error) {
    if (announce && error.name !== 'AbortError') {
      notify(error.message || 'The action could not be completed.', 'error');
      error.notified = true;
    }
    throw error;
  }
}

/** Execute the request while preserving server field validation and authentication handling. */
async function request(path, options) {
  // Express requires an actual JSON body for write requests, including bodyless deletes.
  const method = (options.method ?? 'GET').toUpperCase();
  const body =
    options.body === undefined && !['GET', 'HEAD', 'OPTIONS'].includes(method) ? {} : options.body;
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': body instanceof Blob ? 'application/octet-stream' : 'application/json',
      'X-Requested-With': 'ServiceKraken',
      ...options.headers,
    },
    body: body === undefined ? undefined : body instanceof Blob ? body : JSON.stringify(body),
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
