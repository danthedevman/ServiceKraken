import React from 'react';
/** A compact value and its interpretation, used for saved check details. */
export function Stat({ title, value, note }) {
  return (
    <div className="panel p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </div>
  );
}
