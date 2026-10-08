/** Aggregate recorded checks by UTC date, weighting uptime by check count rather than monitor count.
 * @param {object} data Status API response. @param {number} days 7 or 30 calendar days.
 * @returns {object} Chart data with explicit empty values.
 */
export function dashboardData(data, days = 30) {
  const today = new Date(data.generatedAt);
  today.setUTCHours(0, 0, 0, 0);
  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - days + 1 + index);
    return { day: date.toISOString().slice(0, 10), up: 0, down: 0, total: 0 };
  });
  const byDate = new Map(daily.map((day) => [day.day, day]));
  const monitors = data.monitors ?? [];
  for (const monitor of monitors)
    for (const record of monitor.history ?? []) {
      const day = byDate.get(record.day);
      if (day) {
        day.up += record.up;
        day.down += record.total - record.up;
        day.total += record.total;
      }
    }
  const total = daily.reduce((sum, day) => sum + day.total, 0);
  const up = daily.reduce((sum, day) => sum + day.up, 0);
  const counts = Object.fromEntries(
    ['up', 'down', 'pending', 'unknown', 'paused'].map((status) => [
      status,
      monitors.filter((monitor) => monitor.status === status).length,
    ]),
  );
  const latency = monitors
    .filter(
      (monitor) =>
        ['up', 'down'].includes(monitor.status) && Number.isFinite(monitor.lastCheck?.durationMs),
    )
    .map((monitor) => ({ id: monitor.id, name: monitor.name, value: monitor.lastCheck.durationMs }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  return { daily, total, up, uptime: total ? up / total : null, counts, latency };
}
