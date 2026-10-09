import React, { useId, useRef, useState } from 'react';
import { Cog6ToothIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

/** Configure data columns while keeping selection and record navigation outside the editable list. */
export function TableColumns({ columns, hidden, onToggle, onMove, onReset }) {
  const id = useId(),
    panel = useRef(null),
    trigger = useRef(null);
  const [open, setOpen] = useState(false);
  function toggle() {
    if (panel.current.matches(':popover-open')) return panel.current.hidePopover();
    panel.current.showPopover();
    const anchor = trigger.current.getBoundingClientRect();
    const bounds = panel.current.getBoundingClientRect();
    panel.current.style.left = `${Math.max(8, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 8))}px`;
    panel.current.style.top = `${Math.max(8, Math.min(anchor.bottom + 6, window.innerHeight - bounds.height - 8))}px`;
    panel.current.querySelector('input')?.focus();
  }
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="btn-secondary !p-2.5"
        aria-label="Configure Columns"
        title="Configure Columns"
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
      >
        <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="dialog"
        aria-label="Table Columns"
        className="table-columns-menu"
        onToggle={(event) => setOpen(event.newState === 'open')}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            panel.current.hidePopover();
            trigger.current.focus();
          }
        }}
      >
        <p className="mb-3 font-semibold">Columns</p>
        <p className="mb-3 text-xs text-slate-500">Selection and Open Record stay fixed.</p>
        <ul className="space-y-2">
          {columns.map((column, index) => (
            <li key={column.key} className="flex items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!hidden.includes(column.key)}
                  onChange={() => onToggle(column.key)}
                />
                <span className="truncate">{column.label}</span>
              </label>
              <button
                type="button"
                className="btn-secondary !p-2"
                disabled={index === 0}
                aria-label={`Move ${column.label} left`}
                onClick={() => onMove(index, -1)}
              >
                <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn-secondary !p-2"
                disabled={index === columns.length - 1}
                aria-label={`Move ${column.label} right`}
                onClick={() => onMove(index, 1)}
              >
                <ArrowDownIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between gap-2">
          <button type="button" className="btn-secondary" onClick={onReset}>
            Reset Columns
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              panel.current.hidePopover();
              trigger.current.focus();
            }}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
