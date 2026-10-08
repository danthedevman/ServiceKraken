/** @param {string | Date | null} value @returns {string} */
export function dateTime(value) {
  return value
    ? new Date(value).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : 'Not checked yet';
}
