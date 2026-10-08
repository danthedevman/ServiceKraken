import { Skeleton } from './skeleton.jsx';
import { RelatedListContext } from './record-tabs.jsx';
import { Select } from './forms/select.jsx';
import { ServerTable } from './server-table.jsx';
import { useContext } from 'react';
import { AuthContext } from '../auth/auth-context.js';
import { Modal } from './modal.jsx';
import { writeApi } from '../data/query-client.js';
import { ActionMenu } from './action-menu.jsx';
import React, { useEffect, useId, useRef, useState } from 'react';
import {
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { RefreshButton } from './icon-button.jsx';
import { toCsv } from '../../../shared/files/csv.js';
import { saveCsv } from '../lib/csv-download.js';

/** One table for server-paged records. Filtering, sorting and exports execute on the server.
 * Columns define plain values for sorting/filtering/CSV and optional safe React rendering.
 * @param {{title: string, columns: Array<object>, fullPage?: boolean, actions?: React.ReactNode, toolbar?: React.ReactNode, rows?: Array<object>, remote?: object, filters?: React.ReactNode, defaultSort?: string, dateColumn?: string, filename?: string, description?: string, tableClassName?: string, rowKey?: Function}} props
 */
export function DataTable(props) {
  if (!props.source && !props.remote)
    throw new Error('DataTable requires a server source or remote pagination.');
  return props.source ? (
    <ServerTable {...props} render={DataTableView} />
  ) : (
    <DataTableView {...props} />
  );
}

function DataTableView({
  deletePath,
  onDeleteRow,
  onRefresh,
  fullPage = false,
  loading = false,
  actions,
  secondaryActions,
  toolbar,
  title,
  columns,
  rows = [],
  remote,
  filters,
  filename = 'table.csv',
  description,
  tableClassName = 'w-full min-w-[520px] text-left text-sm',
  rowKey = (row) => row.id ?? JSON.stringify(row),
}) {
  const related = useContext(RelatedListContext);
  const { user } = useContext(AuthContext);
  const [selection, setSelection] = useState({ scope: '', ids: new Set() });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [confirmRows, setConfirmRows] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  const Heading = fullPage ? 'h1' : 'h2';
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exportError, setExportError] = useState('');
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  const invalid = remote.invalid;
  const size = remote.pageSize;
  const total = remote.total;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = remote.page;
  const visible = rows;
  const initialLoading = (loading || remote.loading) && rows.length === 0;
  const keys = visible.map((row, index) => String(rowKey(row, index)));
  const scope = JSON.stringify(keys);
  const selected = selection.scope === scope ? selection.ids : new Set();
  const selectedRows = visible.filter((row, index) => selected.has(keys[index]));
  const allSelected = visible.length > 0 && selectedRows.length === visible.length;
  /** Selection is scoped to the visible page, preventing hidden rows from being deleted. */
  function selectRow(key, checked) {
    const ids = new Set(selected);
    if (checked) ids.add(key);
    else ids.delete(key);
    setSelection({ scope, ids });
  }
  async function deleteSelected() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError('');
    let count = 0;
    try {
      for (const row of confirmRows) {
        if (onDeleteRow) await onDeleteRow(row);
        else
          await writeApi(`${deletePath}/${encodeURIComponent(row.id)}`, {
            method: 'DELETE',
            body: { revision: row.revision },
          });
        count++;
      }
      setSelection({ scope: '', ids: new Set() });
      setConfirmRows(null);
    } catch (error) {
      setConfirmRows((current) => current.slice(count));
      setDeleteError(`${count ? `${count} deleted. ` : ''}${error.message}`);
    } finally {
      setDeleting(false);
    }
  }
  const activeSort = remote.sort ?? '';
  const [sortKey, direction] = activeSort.split(':');
  const filtersActive = Boolean(remote.filtersActive);
  const busy = (remote?.pending ?? false) || refreshing;
  function changeSort(value) {
    remote.onSort(value);
  }
  /** Snapshot the current filters on click; cancellation prevents downloads after leaving the page. */
  async function exportRows() {
    setExporting(true);
    setExportError('');
    const pending = new AbortController();
    controller.current = pending;
    try {
      await remote.onExport(pending.signal);
    } catch (error) {
      if (!pending.signal.aborted) setExportError(error.message);
    } finally {
      if (!pending.signal.aborted) setExporting(false);
    }
  }
  return (
    <section
      className={
        fullPage
          ? 'data-table list-table'
          : related
            ? 'data-table related-table overflow-hidden'
            : 'data-table panel overflow-hidden'
      }
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 ${related ? 'px-4 py-3' : 'px-6 py-5'}`}
      >
        <div className={related ? 'sr-only' : undefined}>
          <Heading className={fullPage ? 'page-title' : 'font-semibold'}>{title}</Heading>
          {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {actions}
          <button
            type="button"
            className="btn-secondary gap-2"
            aria-label="Filters"
            title="Filters"
            aria-expanded={filtersOpen}
            aria-controls={filtersId}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <FunnelIcon className="h-5 w-5" aria-hidden="true" />
            {filtersActive && (
              <span className="rounded-full bg-blue-100 px-2 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                Active
              </span>
            )}
          </button>
          {(remote?.onRefresh || onRefresh) && (
            <RefreshButton
              busy={busy}
              onClick={async () => {
                setRefreshing(true);
                setExportError('');
                try {
                  await (remote?.onRefresh || onRefresh)();
                } catch (error) {
                  setExportError(error.message);
                } finally {
                  setRefreshing(false);
                }
              }}
              label={`Refresh ${title.toLowerCase()}`}
            />
          )}
          {selectedRows.length > 0 && (
            <>
              <span className="self-center text-xs" role="status">
                {selectedRows.length} selected
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  saveCsv(
                    new Blob([toCsv(selectedRows, columns)], { type: 'text/csv;charset=utf-8' }),
                    filename.replace(/\.csv$/, '-selected.csv'),
                  )
                }
              >
                Export selected
              </button>
              {user?.role === 'admin' && (deletePath || onDeleteRow) && (
                <button
                  type="button"
                  className="btn-secondary text-rose-700"
                  disabled={deleting}
                  onClick={() => {
                    setDeleteError('');
                    setConfirmRows([...selectedRows]);
                  }}
                >
                  Delete selected
                </button>
              )}
            </>
          )}
          <ActionMenu label={`${title} actions`}>
            {secondaryActions}
            <button
              type="button"
              className="btn-secondary gap-2"
              disabled={exporting || busy || invalid}
              onClick={exportRows}
              title="Export all filtered rows, across all pages"
            >
              <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </ActionMenu>
        </div>
      </div>
      {toolbar}
      <div id={filtersId} hidden={!filtersOpen}>
        {filters}
      </div>
      {exportError && (
        <p role="alert" className="px-6 py-3 text-sm text-rose-700 dark:text-rose-400">
          {exportError}
        </p>
      )}
      {invalid ? (
        <p role="alert" className="p-6 text-sm text-rose-700 dark:text-rose-400">
          Correct the date range to load records.
        </p>
      ) : (
        <div
          className="table-rows loading-content overflow-x-auto"
          aria-busy={busy || initialLoading}
        >
          <table className={tableClassName}>
            <caption className="sr-only">
              {title}
              {initialLoading ? ' — Loading rows…' : ''}
            </caption>
            <colgroup>
              <col style={{ width: '3rem' }} />
              {columns.map((column) => (
                <col key={column.key} style={column.width ? { width: column.width } : undefined} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    title="Select all rows on this page"
                    checked={allSelected}
                    disabled={initialLoading || !visible.length || deleting}
                    ref={(node) => {
                      if (node) node.indeterminate = selectedRows.length > 0 && !allSelected;
                    }}
                    onChange={(event) =>
                      setSelection({ scope, ids: event.target.checked ? new Set(keys) : new Set() })
                    }
                  />
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      column.sortable === false
                        ? undefined
                        : sortKey === column.key
                          ? direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                    }
                  >
                    {column.sortable === false ? (
                      column.label
                    ) : (
                      <button
                        className="inline-flex items-center gap-1"
                        onClick={() =>
                          changeSort(
                            `${column.key}:${sortKey === column.key && direction === 'asc' ? 'desc' : 'asc'}`,
                          )
                        }
                      >
                        {column.label}
                        {sortKey === column.key ? (
                          direction === 'asc' ? (
                            <ArrowUpIcon className="h-4 w-4" />
                          ) : (
                            <ArrowDownIcon className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowsUpDownIcon className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialLoading ? (
                Array.from({ length: size }, (_, index) => (
                  <tr key={index} aria-hidden="true">
                    <td>
                      <Skeleton className="h-4 w-4" />
                    </td>
                    {columns.map((column) => (
                      <td key={column.key} className={column.className}>
                        <Skeleton className="h-5 w-full max-w-48" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visible.length ? (
                visible.map((row, index) => (
                  <tr key={rowKey(row, index)} aria-selected={selected.has(keys[index])}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select row ${index + 1}`}
                        checked={selected.has(keys[index])}
                        disabled={deleting}
                        onChange={(event) => selectRow(keys[index], event.target.checked)}
                      />
                    </td>
                    {columns.map((column) => (
                      <td key={column.key} className={column.className}>
                        {column.key === 'actions' && column.render ? (
                          <RowActions render={column.render} row={row} />
                        ) : column.render ? (
                          column.render(row)
                        ) : (
                          String(column.value(row) ?? '—')
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 1} className="py-14 text-center text-slate-500">
                    No matching records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <nav
        aria-label={`${title} pages`}
        className="table-pagination flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-xs dark:border-slate-800"
      >
        <span aria-live="polite">
          {total.toLocaleString()} matching records · Page {current} of {pages}
        </span>
        <label className="flex items-center gap-2">
          Rows per page
          <Select
            className="history-select !mt-0 !w-auto"
            value={size}
            onChange={(event) => {
              const value = Number(event.target.value);
              remote.onPageSize(value);
            }}
          >
            {[10, 25, 50].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex gap-2">
          <button
            className="btn-secondary gap-1"
            disabled={current <= 1 || busy || invalid}
            onClick={() => remote.onPage(current - 1)}
          >
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
            Previous
          </button>
          <button
            className="btn-secondary gap-1"
            disabled={current >= pages || busy || invalid}
            onClick={() => remote.onPage(current + 1)}
          >
            Next
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </nav>
      {confirmRows && (
        <Modal
          title={`Delete ${confirmRows.length} selected records?`}
          busy={deleting}
          onClose={() => setConfirmRows(null)}
          footer={
            <>
              <button
                type="button"
                className="btn-secondary"
                disabled={deleting}
                onClick={() => setConfirmRows(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={deleting || !confirmRows.length}
                onClick={deleteSelected}
              >
                {deleting ? 'Deleting…' : 'Delete records'}
              </button>
            </>
          }
        >
          <p>
            This permanently deletes the selected records. Related attachments or history may also
            be removed. This cannot be undone.
          </p>
          <ul className="mt-3 max-h-48 overflow-auto text-sm">
            {confirmRows.map((row, index) => (
              <li key={index}>
                {row.title || row.name || row.email || row.id || `Row ${index + 1}`}
              </li>
            ))}
          </ul>
          {deleteError && (
            <p role="alert" className="mt-3 text-rose-700">
              {deleteError}
            </p>
          )}
        </Modal>
      )}
    </section>
  );
}

/** Do not show a row menu when that row has no permitted actions. */
function RowActions({ render, row }) {
  const content = render(row);
  return content ? <ActionMenu label="Record actions">{content}</ActionMenu> : null;
}
