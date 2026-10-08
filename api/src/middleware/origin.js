/** Match the configured origin, allowing exact loopback aliases for local development.
 * Scheme and port must still match. Non-loopback deployments accept only their configured origin.
 * @param {string} origin @param {string} configured @returns {boolean}
 */
export function isAllowedOrigin(origin, configured) {
  try {
    const actual = new URL(origin);
    const expected = new URL(configured);
    if (actual.origin !== origin) return false;
    if (actual.origin === expected.origin) return true;
    const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
    return (
      loopback.has(expected.hostname) &&
      loopback.has(actual.hostname) &&
      actual.protocol === expected.protocol &&
      actual.port === expected.port
    );
  } catch {
    return false;
  }
}
