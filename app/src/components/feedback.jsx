import { StateBadge } from './state-badge.jsx';
import React from 'react';

export const statusLabels = {
  up: 'Operational',
  down: 'Down',
  degraded: 'Degraded',
  pending: 'Awaiting check',
  paused: 'Paused',
  unknown: 'Unknown',
};

/** @param {{status: string}} props */
export function Badge({ status }) {
  return <StateBadge status={status} label={statusLabels[status]} />;
}

/** @param {{children: React.ReactNode}} props */
export function ErrorNotice({ children }) {
  return children ? (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950 px-4 py-3 text-sm text-rose-800 dark:text-rose-300"
    >
      {children}
    </div>
  ) : null;
}

/** Announce initial loading without adding visible text or shifting page content.
 * @param {{label?: string}} props
 */
export function Loading({ label = 'Loading…' }) {
  return (
    <p role="status" className="sr-only">
      {label}
    </p>
  );
}
