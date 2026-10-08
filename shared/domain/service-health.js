/** Match status-page rollups while treating stale, paused, or absent checks as unknown. */
export function serviceHealth(services, monitors, now = Date.now()) {
  const states = new Map();
  const visit = (id, seen = new Set()) => {
    if (states.has(id)) return states.get(id);
    if (seen.has(id)) return 'unknown';
    const service = services.find((s) => s.id === id);
    if (!service) return 'unknown';
    const next = new Set([...seen, id]);
    const values = monitors
      .filter((m) => String(m.serviceId) === id)
      .map((m) =>
        m.paused ||
        !m.lastCheck ||
        now - +new Date(m.lastCheck.checkedAt) > (m.intervalMinutes * 60 + 60) * 1000
          ? 'unknown'
          : m.lastCheck.status,
      );
    values.push(...service.dependencyIds.map((d) => visit(d, next)));
    const status = values.includes('down')
      ? 'down'
      : values.length && values.every((v) => v === 'up')
        ? 'up'
        : 'unknown';
    states.set(id, status);
    return status;
  };
  for (const s of services) visit(s.id);
  return states;
}
