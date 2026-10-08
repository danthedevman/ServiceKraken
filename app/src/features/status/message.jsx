import React from 'react';
import {
  InformationCircleIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

const levels = {
  info: {
    label: 'Information',
    icon: InformationCircleIcon,
    color:
      'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
  },
  maintenance: {
    label: 'Maintenance',
    icon: WrenchScrewdriverIcon,
    color:
      'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100',
  },
  warning: {
    label: 'Warning',
    icon: ExclamationTriangleIcon,
    color:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
  },
  critical: {
    label: 'Critical',
    icon: ExclamationCircleIcon,
    color:
      'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100',
  },
};

/** Render announcements as text with criticality conveyed by both icon and label. */
export function StatusMessage({ message, compact = false }) {
  if (!message?.enabled || !message.text) return null;
  const { label, icon: Icon, color } = levels[message.level] ?? levels.info;
  return (
    <aside
      aria-label={`${label} status message`}
      className={`w-full rounded-lg border ${color} ${compact ? 'p-3 text-sm' : 'p-5'}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold">{label}</p>
          <p className="mt-1 whitespace-pre-wrap break-words">{message.text}</p>
        </div>
      </div>
    </aside>
  );
}
