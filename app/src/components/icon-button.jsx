import React, { useContext } from 'react';
import { ActionMenuContext } from './action-menu.jsx';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

/** An accessible refresh control that indicates work without shifting its layout. */
export function RefreshButton({ busy, onClick, label = 'Refresh' }) {
  const inMenu = useContext(ActionMenuContext);
  return (
    <button
      type="button"
      className="btn-secondary p-2.5"
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
