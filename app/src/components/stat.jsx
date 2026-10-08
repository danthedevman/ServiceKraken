import React from 'react';
/** A compact value and its interpretation, used for saved check details. */
export function Stat({ title, value, note, compact = false }) {
  return (
    <div className="panel p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <p className={`mt-3 font-semibold ${compact ? 'text-base leading-6' : 'text-3xl'}`}>
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
    </div>
  );
}
