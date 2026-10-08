import { auditFields } from '@servicekraken/shared/domain/audit';

/** @param {object} monitor @returns {object} Client-safe monitor representation. */
export function serializeMonitor(monitor) {
  const { _id, name, url, intervalMinutes, paused, createdAt, nextCheckAt, lastCheck } = monitor;
  const stale =
    lastCheck &&
    Date.now() - new Date(lastCheck.checkedAt).getTime() > (intervalMinutes * 60 + 60) * 1000;
  const status = paused ? 'paused' : !lastCheck ? 'pending' : stale ? 'unknown' : lastCheck.status;
  return {
    type: monitor.type || 'http',
    unsupported: !!monitor.type && monitor.type !== 'http',
    ...auditFields(monitor),
    lastStartedAt: monitor.lastStartedAt,
    serviceId: monitor.serviceId?.toHexString() ?? null,
    component: monitor.component ?? '',
    id: _id.toHexString(),
    name,
    url,
    intervalMinutes,
    method: monitor.method ?? 'GET',
    followRedirects: monitor.followRedirects === true,
    paused,
    createdAt,
    nextCheckAt,
    lastCheck,
    status,
  };
}
