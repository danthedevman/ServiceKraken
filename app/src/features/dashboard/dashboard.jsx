import { DateTime } from '../../preferences/date-time.jsx';
import { StateBadge } from '../../components/state-badge.jsx';
import React from 'react';
import { Link } from 'react-router-dom';
import { arc, pie, scaleLinear, format } from 'd3';
import { DataTable } from '../../components/data-table.jsx';
import { RecordTabs } from '../../components/record-tabs.jsx';
import { useResource } from '../../data/use-resource.js';
import { RefreshButton } from '../../components/icon-button.jsx';
import { displayValue } from '../../lib/display-value.js';
import { dashboardData } from './dashboard-data.js';

const number = format(',d'),
  palette = ['#2563eb', '#d97706', '#e11d48', '#7c3aed', '#64748b'];
const severityColors = { critical: '#e11d48', high: '#e11d48', medium: '#d97706', low: '#2563eb' };
/** Scores show complete workspace aggregates, never just a paginated list's counts. */
function Score({ label, value, note }) {
  return (
    <section className="panel p-5">
      <h2 className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</h2>
      <p className="mt-2 text-3xl font-semibold">
        {typeof value === 'number' ? number(value) : value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </section>
  );
}
/** D3 donut geometry, with exact accessible values and an explicit empty state. */
function PieChart({ title, rows, note }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0),
    shape = arc().innerRadius(65).outerRadius(100).padAngle(0.02).cornerRadius(3);
  const slices = pie()
    .value((row) => row.value)
    .sort(null)(rows);
  return (
    <section className="panel min-w-0 p-6">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
      <svg
        viewBox="-120 -120 240 240"
        className="mx-auto my-3 w-full max-w-60"
        role="group"
        aria-label={title}
      >
        {!total && (
          <circle
            r="82"
            fill="none"
            strokeWidth="34"
            className="stroke-slate-200 dark:stroke-slate-700"
          />
        )}
        {slices
          .filter((row) => row.value)
          .map((slice, index) => (
            <path
              key={slice.data.label}
              d={shape(slice)}
              fill={slice.data.color ?? palette[index % palette.length]}
              tabIndex={0}
              role="img"
              aria-label={`${slice.data.label}: ${slice.value}, ${format('.1%')(slice.value / total)}`}
            >
              <title>
                {slice.data.label}: {number(slice.value)} ({format('.1%')(slice.value / total)})
              </title>
            </path>
          ))}
        <text textAnchor="middle" className="fill-current text-3xl font-semibold" y="8">
          {number(total)}
        </text>
      </svg>
      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li key={row.label} className="flex justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-2">
              <svg width="10" height="10" aria-hidden="true">
                <circle cx="5" cy="5" r="5" fill={row.color ?? palette[index % palette.length]} />
              </svg>
              {row.label}
            </span>
            <strong>{number(row.value)}</strong>
          </li>
        ))}
      </ul>
      {!total && <p className="mt-3 text-sm text-slate-500">No records to report.</p>}
    </section>
  );
}
/** D3 horizontal bars make differences comparable; labels remain readable on narrow screens. */
function BarChart({ title, rows, note }) {
  const width = scaleLinear()
    .domain([0, Math.max(1, ...rows.map((row) => row.value))])
    .range([0, 360]);
  return (
    <section className="panel min-w-0 p-6">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
      <ul className="mt-6 space-y-5">
        {rows.map((row, index) => (
          <li key={row.label}>
            <div className="flex justify-between gap-4 text-sm">
              <span className="min-w-0 break-words">{row.label}</span>
              <strong>{number(row.value)}</strong>
            </div>
            <svg
              viewBox="0 0 360 14"
              className="mt-2 w-full"
              role="img"
              aria-label={`${row.label}: ${row.value}`}
            >
              <rect width="360" height="14" rx="7" className="fill-slate-100 dark:fill-slate-800" />
              <rect
                width={width(row.value)}
                height="14"
                rx="7"
                fill={row.color ?? palette[index % palette.length]}
              />
            </svg>
          </li>
        ))}
      </ul>
      {!rows.length && <p className="mt-6 text-sm text-slate-500">No records to report.</p>}
    </section>
  );
}
/** Separate response, workload, and health views without clearing charts during refreshes. */
export function Dashboard() {
  const response = useResource('/response-dashboard', 30000),
    health = useResource('/status', 30000),
    data = response.data;
  const chart = health.data ? dashboardData(health.data, 30) : null;
  const total = (values) => Object.values(values ?? {}).reduce((sum, value) => sum + value, 0);
  const rows = (values, keys) =>
    keys.map((key) => ({
      label: displayValue(key),
      value: values?.[key] ?? 0,
      color: severityColors[key],
    }));
  const link = (kind, row) => (
    <Link className="text-blue-700 hover:underline dark:text-blue-300" to={`/${kind}/${row.id}`}>
      {row.title}
    </Link>
  );
  const healthLabels = {
    up: 'Operational',
    down: 'Down',
    degraded: 'Degraded',
    unknown: 'Unknown / stale',
    pending: 'Awaiting check',
    paused: 'Paused',
  };
  const healthColors = {
    up: '#10b981',
    down: '#e11d48',
    degraded: '#d97706',
    unknown: '#64748b',
    pending: '#d97706',
    paused: '#64748b',
  };
  const healthRows = (counts) =>
    Object.entries(counts).map(([key, value]) => ({
      label: healthLabels[key],
      value,
      color: healthColors[key],
    }));
  const incidents = data ? (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Score
          label="Unresolved incidents"
          value={total(data.severity)}
          note="Open and acknowledged"
        />
        <Score
          label="Critical / high"
          value={(data.severity.critical ?? 0) + (data.severity.high ?? 0)}
          note={`${data.severity.critical ?? 0} critical · ${data.severity.high ?? 0} high`}
        />
        <Score
          label="Unassigned"
          value={data.unassigned}
          note="Unresolved incidents without an assignee"
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <BarChart
          title="Unresolved Incidents by Severity"
          rows={rows(data.severity, ['critical', 'high', 'medium', 'low'])}
          note="All unresolved incidents · custom labels use their workflow mapping"
        />
        <PieChart
          title="Response Status"
          rows={rows(data.incidentStatus, ['open', 'acknowledged'])}
          note="How much active work has been acknowledged"
        />
      </div>
      <DataTable
        title="Priority Incidents"
        description="Highest severity first, then oldest within severity. Export covers this queue."
        rows={data.incidents}
        rowKey={(row) => row.id}
        source="priority-incidents"
        filename="priority-incidents.csv"
        deletePath="/incidents"
        columns={[
          {
            key: 'title',
            label: 'Incident',
            value: (row) => row.title,
            render: (row) => link('incidents', row),
          },
          {
            key: 'severity',
            label: 'Severity',
            value: (row) => row.severityLabel || displayValue(row.severity),
            render: (row) => <StateBadge status={row.severity} label={row.severityLabel} />,
          },
          {
            key: 'status',
            label: 'Status',
            value: (row) => row.statusLabel || displayValue(row.status),
            render: (row) => <StateBadge status={row.status} label={row.statusLabel} />,
          },
          { key: 'serviceName', label: 'Service', value: (row) => row.serviceName },
        ]}
      />
    </div>
  ) : (
    <p role="status">
      {response.error ? 'Incident reporting unavailable.' : 'Loading incident reporting…'}
    </p>
  );
  const tasks = data ? (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Score
          label="Outstanding tasks"
          value={total(data.taskStatus)}
          note="To do, in progress, and blocked"
        />
        <Score
          label="Blocked tasks"
          value={data.taskStatus.blocked ?? 0}
          note="Work requiring intervention"
        />
        <Score
          label="Overdue tasks"
          value={data.overdue}
          note="Outstanding tasks due before today (UTC)"
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <PieChart
          title="Task Workload by Status"
          rows={rows(data.taskStatus, ['todo', 'in_progress', 'blocked'])}
          note="Outstanding tasks only"
        />
        <BarChart
          title="Outstanding Tasks by Priority"
          rows={rows(data.taskPriority, ['high', 'medium', 'low'])}
          note="All outstanding tasks, including overdue work"
        />
      </div>
      <DataTable
        title="Priority Tasks"
        description="Search and export all outstanding records."
        rows={data.tasks}
        rowKey={(row) => row.id}
        source="priority-tasks"
        filename="priority-tasks.csv"
        deletePath="/tasks"
        columns={[
          {
            key: 'title',
            label: 'Task',
            value: (row) => row.title,
            render: (row) => link('tasks', row),
          },
          {
            key: 'priority',
            label: 'Priority',
            value: (row) => row.priorityLabel || displayValue(row.priority),
            render: (row) => <StateBadge status={row.priority} label={row.priorityLabel} />,
          },
          {
            key: 'status',
            label: 'Status',
            value: (row) => row.statusLabel || displayValue(row.status),
            render: (row) => <StateBadge status={row.status} label={row.statusLabel} />,
          },
          { key: 'dueDate', label: 'Due date (UTC)', value: (row) => row.dueDate || '—' },
        ]}
      />
    </div>
  ) : (
    <p role="status">
      {response.error ? 'Task reporting unavailable.' : 'Loading task reporting…'}
    </p>
  );
  const services =
    chart && data ? (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Score
            label="Services with incidents"
            value={data.services.length}
            note="Distinct services with unresolved incidents"
          />
          <Score
            label="Services down"
            value={health.data.services.filter((service) => service.status === 'down').length}
            note="Current checks and dependencies"
          />
          <Score
            label="Recorded monitor uptime"
            value={chart.uptime === null ? '—' : format('.2%')(chart.uptime)}
            note="30 UTC days · weighted by recorded checks"
          />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <PieChart
            title="Service Health"
            rows={healthRows(
              Object.fromEntries(
                ['up', 'degraded', 'down', 'unknown'].map((status) => [
                  status,
                  health.data.services.filter((service) => service.status === status).length,
                ]),
              ),
            )}
            note="Missing and stale checks are not treated as healthy"
          />
          <BarChart
            title="Services with the Most Active Incidents"
            rows={[...data.services]
              .sort((a, b) => b.count - a.count)
              .slice(0, 8)
              .map((service) => ({
                label: service.name,
                value: service.count,
                color: service.critical ? '#e11d48' : '#2563eb',
              }))}
            note="Top 8 by unresolved incident count · rose indicates critical incidents"
          />
        </div>
        <DataTable
          title="Services with Active Incidents"
          rows={data.services}
          rowKey={(row) => row.id}
          source="impacted-services"
          filename="impacted-services.csv"
          deletePath="/services"
          defaultSort="count:desc"
          columns={[
            {
              key: 'name',
              label: 'Service',
              value: (row) => row.name,
              render: (row) => (
                <Link className="text-blue-700 dark:text-blue-300" to={`/services/${row.id}`}>
                  {row.name}
                </Link>
              ),
            },
            { key: 'count', label: 'Unresolved incidents', value: (row) => row.count },
            { key: 'critical', label: 'Critical', value: (row) => row.critical },
          ]}
        />
        <PieChart
          title="Monitor Health"
          rows={healthRows(chart.counts)}
          note="Current state including paused and unverified monitors"
        />
      </div>
    ) : (
      <p role="status">
        {health.error || response.error
          ? 'Service reporting unavailable.'
          : 'Loading service health…'}
      </p>
    );
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="page-title">Dashboard</h1>
        <RefreshButton
          busy={response.pending || health.pending}
          label="Refresh dashboard"
          onClick={() => Promise.all([response.refresh(), health.refresh()])}
        />
      </div>
      {(response.error || health.error) && (
        <p role="alert" className="text-rose-700 dark:text-rose-400">
          {response.error || health.error}
        </p>
      )}
      <RecordTabs
        label="Dashboard reports"
        tabs={[
          { id: 'incidents', label: 'Incidents', content: incidents },
          { id: 'tasks', label: 'Tasks', content: tasks },
          { id: 'services', label: 'Service Health', content: services },
        ]}
      />
      {data && (
        <p className="text-xs text-slate-500">
          Updated {<DateTime value={data.generatedAt} />} · Refreshes every 30 seconds
        </p>
      )}
    </div>
  );
}
