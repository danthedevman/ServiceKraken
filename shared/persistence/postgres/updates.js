import { encode, decode, key } from './codec.js';

/** Evaluate the small update-expression vocabulary against a locked record and database time. */
function expression(value, row, now) {
  if (value === '$$NOW') return now;
  if (typeof value === 'string' && value.startsWith('$')) return get(row, value.slice(1));
  if (Array.isArray(value)) return value.map((v) => expression(v, row, now));
  if (!value || typeof value !== 'object' || value instanceof Date || value._bsontype) return value;
  const [[op, arg]] = Object.entries(value);
  const ex = (v) => expression(v, row, now);
  if (op === '$literal') return arg;
  if (op === '$ifNull') return ex(arg[0]) ?? ex(arg[1]);
  if (op === '$cond') return ex(arg[0]) ? ex(arg[1]) : ex(arg[2]);
  if (op === '$add') return arg.map(ex).reduce((a, b) => a + b, 0);
  if (op === '$max') return arg.map(ex).reduce((a, b) => (a > b ? a : b));
  if (op === '$dateAdd') {
    const unit = { minute: 60000, day: 86400000 }[arg.unit];
    if (!unit) throw new Error('Unsupported update date unit');
    return new Date(+new Date(ex(arg.startDate)) + ex(arg.amount) * unit);
  }
  throw new Error(`Unsupported update expression: ${op}`);
}
/** Read a validated dotted field path. */
function get(row, path) {
  return path.split('.').reduce((v, k) => v?.[k], row);
}
/** Set fields without allowing prototype mutation from persisted or caller data. */
function set(row, path, value, remove = false) {
  const parts = path.split('.');
  if (parts.some((p) => ['__proto__', 'prototype', 'constructor'].includes(p)))
    throw new Error('Invalid update field');
  const leaf = parts.pop();
  let target = row;
  for (const part of parts) target = target[part] ??= {};
  if (remove) delete target[leaf];
  else target[leaf] = value;
}
function matches(value, filter) {
  if (!filter || typeof filter !== 'object' || filter._bsontype) return key(value) === key(filter);
  return Object.entries(filter).every(([k, v]) => key(value?.[k]) === key(v));
}
/** Apply modifications only inside a transaction holding the corresponding row lock. */
export function updateRecord(source, update, now, inserted = false) {
  const row = decode(encode(source));
  if (Array.isArray(update)) {
    for (const stage of update) {
      if (Object.keys(stage).some((k) => k !== '$set')) throw new Error('Unsupported update stage');
      const values = Object.entries(stage.$set).map(([k, v]) => [k, expression(v, row, now)]);
      for (const [k, v] of values) set(row, k, v);
    }
    return row;
  }
  for (const [op, fields] of Object.entries(update))
    for (const [path, value] of Object.entries(fields)) {
      if (op === '$set' || (op === '$setOnInsert' && inserted)) set(row, path, value);
      else if (op === '$setOnInsert') continue;
      else if (op === '$unset') set(row, path, null, true);
      else if (op === '$inc') set(row, path, (get(row, path) ?? 0) + value);
      else if (op === '$push') {
        let values = [...(get(row, path) ?? []), ...(value?.$each ?? [value])];
        if (value?.$slice !== undefined)
          values = value.$slice < 0 ? values.slice(value.$slice) : values.slice(0, value.$slice);
        set(row, path, values);
      } else if (op === '$pull')
        set(
          row,
          path,
          (get(row, path) ?? []).filter((v) => !matches(v, value)),
        );
      else throw new Error(`Unsupported update: ${op}`);
    }
  return row;
}
