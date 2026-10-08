import test from 'node:test';
import assert from 'node:assert/strict';
import { csvRow, toCsv } from '../shared/files/csv.js';
import { embeddedTable, tableQuery } from '../api/src/repositories/table-page.js';

/** Exercise the server-owned bounded-configuration path, including identical export ordering. */
async function tableRows(rows, columns, options = {}) {
  const [sortBy, order] = (options.sort || `${columns[0].key}:asc`).split(':');
  const source = embeddedTable(
    rows,
    columns.map((c) => c.key),
    options.dateColumn,
  );
  const query = tableQuery({ ...options, sortBy, order }, source.fields, source.dateColumn);
  return (await source.read(query, true)).cursor;
}

test('CSV preserves punctuation and multiline text and neutralizes spreadsheet formulas', () => {
  assert.equal(csvRow(['a,b', 'a"b', 'a\nb', null, 42]), '"a,b","a""b","a\nb","","42"\r\n');
  assert.equal(
    csvRow(['=SUM(A1)', ' +cmd', '@formula', '\ttext', '-formula', -5]),
    '"\'=SUM(A1)","\' +cmd","\'@formula","\'\ttext","\'-formula","-5"\r\n',
  );
});

test('server filtering and numeric sorting apply before CSV export and paging', async () => {
  const rows = Array.from({ length: 30 }, (_, index) => ({
    day: `2026-10-${String(index + 1).padStart(2, '0')}`,
    name: index % 2 ? 'API' : 'Website',
    count: index,
  }));
  const columns = [
    { key: 'day', label: 'Date', value: (row) => row.day },
    { key: 'name', label: 'Name', value: (row) => row.name },
    { key: 'count', label: 'Count', value: (row) => row.count },
  ];
  const filtered = await tableRows(rows, columns, {
    search: 'api',
    sort: 'count:desc',
    dateColumn: 'day',
    from: '2026-10-02',
    to: '2026-10-28',
  });
  assert.equal(filtered.length, 14);
  assert.equal(filtered[0].count, 27);
  assert.equal(filtered.at(-1).count, 1);
  assert.equal(rows[0].count, 0);
  const csv = toCsv(filtered, columns);
  assert.equal(csv.split('\r\n').filter(Boolean).length, 15);
  assert.ok(csv.includes('"2026-10-02","API","1"'));
  assert.ok(!csv.includes('Website'));
  assert.equal(toCsv([], columns), '\uFEFF"Date","Name","Count"\r\n');
});

test('column search scopes rows before CSV export and leaves all columns as the default', async () => {
  const rows = [
    { name: 'API', owner: 'Maya' },
    { name: 'Checkout', owner: 'API team' },
  ];
  const columns = [
    { key: 'name', label: 'Name', value: (row) => row.name },
    { key: 'owner', label: 'Owner', value: (row) => row.owner },
  ];
  assert.equal((await tableRows(rows, columns, { search: 'api' })).length, 2);
  const filtered = await tableRows(rows, columns, { search: 'API', searchColumn: 'owner' });
  assert.deepEqual(filtered, [rows[1]]);
  assert.ok(!toCsv(filtered, columns).includes('Maya'));
});
