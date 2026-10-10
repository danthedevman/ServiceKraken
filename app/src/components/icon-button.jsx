import React, { useContext } from 'react';
import { ActionMenuContext } from './action-menu.jsx';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

/** An accessible refresh control that indicates work without shifting its layout. */
export function RefreshButton({ busy, onClick, label = 'Refresh', bare = false }) {
  const inMenu = useContext(ActionMenuContext);
  return (
    <button
      type="button"
      className={
        bare
          ? 'inline-flex items-center justify-center p-2 text-slate-600 dark:text-slate-400 focus-visible:outline-2 focus-visible:outline-blue-600'
          : 'btn-secondary p-2.5'
      }
      onClick={onClick}
      disabled={busy}
      aria-label={busy ? `${label} in progress` : label}
      title={label}
      aria-busy={busy}
    >
      {inMenu && <span>{label}</span>}
      <ArrowPathIcon
        className={`h-5 w-5 ${busy ? 'motion-safe:animate-spin' : ''}`}
        aria-hidden="true"
      />
    </button>
  );
}
