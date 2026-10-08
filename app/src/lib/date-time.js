/** Format an instant in an IANA zone, falling back to the browser when no preference is saved.
 * @param {string | Date | null} value
 * @param {string} [timeZone]
 * @returns {string}
 */
export function dateTime(value, timeZone = '') {
  if (!value) return 'Not checked yet';
  const date = new Date(value);
  if (Number.isNaN(+date)) return 'Unavailable';
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  };
  try {
    return new Intl.DateTimeFormat(undefined, {
      ...options,
      ...(timeZone ? { timeZone } : {}),
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(undefined, options).format(date);
  }
}
