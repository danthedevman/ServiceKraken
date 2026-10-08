import { choice, text } from '../validation/fields.js';

/** Build literal, allowlisted column search without changing tenant or role filters. */
export function tableSearch(query, columns) {
  const column = choice(query.searchColumn || '', ['', ...Object.keys(columns)], 'searchColumn');
  const search = text(query.search ?? '', 'search', 100, false).trim();
  if (!search) return {};
  const regex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fields = column ? [columns[column]] : Object.values(columns);
  return {
    $expr: {
      $or: fields.map((field) => ({
        $regexMatch: {
          input: { $convert: { input: field, to: 'string', onError: '', onNull: '' } },
          regex,
          options: 'i',
        },
      })),
    },
  };
}
