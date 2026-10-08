import React, { cloneElement, useId, useState } from 'react';
import { createPortal } from 'react-dom';

/** Portal a short icon label outside scroll containers; preserve the trigger's existing handlers. */
export function Tooltip({ label, children }) {
  const id = useId();
  const [position, setPosition] = useState(null);
  const show = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({
      left: rect.right + 10,
      top: Math.max(20, Math.min(window.innerHeight - 20, rect.top + rect.height / 2)),
    });
  };
  const hide = () => setPosition(null);
  const handlers = {};
  for (const [name, action] of Object.entries({
    onMouseEnter: show,
    onFocus: show,
    onMouseLeave: hide,
    onBlur: hide,
    onClick: hide,
  })) {
    handlers[name] = (event) => {
      children.props[name]?.(event);
      action(event);
    };
  }
  return (
    <>
      {cloneElement(children, {
        ...handlers,
        title: undefined,
        'aria-describedby': label && position ? id : undefined,
        onKeyDown: (event) => {
          children.props.onKeyDown?.(event);
          if (event.key === 'Escape') hide();
        },
      })}
      {label &&
        position &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            className="pointer-events-none fixed z-[100] -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
            style={position}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}
