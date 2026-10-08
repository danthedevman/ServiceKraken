/** Resolve bounded UTC history ranges consistently in the API and browser. */
export function statusRange(value = '30', now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let start = new Date(today),
    end = new Date(today);
  if (value === 'quarter' || value === 'previous-quarter') {
    const month = Math.floor(today.getUTCMonth() / 3) * 3;
    start = new Date(
      Date.UTC(today.getUTCFullYear(), month - (value === 'previous-quarter' ? 3 : 0), 1),
    );
    if (value === 'previous-quarter') end = new Date(Date.UTC(today.getUTCFullYear(), month, 0));
  } else {
    const days = [7, 14, 30].includes(Number(value)) ? Number(value) : 30;
    start.setUTCDate(start.getUTCDate() - days + 1);
  }
  return { start, end, days: Math.round((end - start) / 86400000) + 1 };
}
