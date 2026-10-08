/* eslint no-control-regex: "off" -- Control characters are intentionally rejected or neutralized. */
/** Quote CSV fields and neutralize spreadsheet formulas in untrusted text.
 * Numeric values remain numeric; commas, quotes, and newlines are preserved.
 * @param {Array<unknown>} values @returns {string}
 */
export function csvRow(values) {
  return (
    values
      .map((value) => {
        let text = value == null ? '' : String(value);
        if (
          typeof value === 'string' &&
          (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))
        )
          text = `'${text}`;
        return `"${text.replaceAll('"', '""')}"`;
      })
      .join(',') + '\r\n'
  );
}

/** Serialize a filtered, sorted collection using explicit export columns. */
export function toCsv(rows, columns) {
  return (
    '\uFEFF' +
    csvRow(columns.map((column) => column.exportLabel ?? column.label)) +
    rows
      .map((row) => csvRow(columns.map((column) => (column.exportValue ?? column.value)(row))))
      .join('')
  );
}
