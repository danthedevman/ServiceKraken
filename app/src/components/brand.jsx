import React from 'react';

/** Keep the same brand icon in compact mode, hiding only the wordmark.
 * @param {{className?: string, compact?: boolean}} props
 */
export function Logo({ className = '', compact = false }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-base font-bold tracking-tight ${className}`}
    >
      <img
        src="/favicon.svg?v=trident"
        width="36"
        height="36"
        className="h-9 w-9 shrink-0"
        alt={compact ? 'ServiceTrident' : ''}
      />
      {!compact && (
        <span>
          Service<span className="text-blue-700 dark:text-blue-400">Trident</span>
        </span>
      )}
    </span>
  );
}
