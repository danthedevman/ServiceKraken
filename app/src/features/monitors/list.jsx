import { PlusIcon } from '@heroicons/react/24/outline';
import { AdminOnly } from '../../auth/role-gates.jsx';

import { DataTable } from '../../components/data-table.jsx';

import React from 'react';

import { Link } from 'react-router-dom';

import { Badge } from '../../components/feedback.jsx';

/** Monitor inventory uses the same sortable, filterable, exportable table as events. */
export function MonitorList() {
  const statusName = (value) =>
    ({
      up: 'Operational',
      down: 'Down',
      unknown: 'Unknown',
      paused: 'Paused',
      pending: 'Awaiting check',
    })[value] || 'Unknown';
  return (
    <div className="list-page">
      {
        <DataTable
          source="monitors"
          deletePath="/monitors"
          fullPage
          actions={
            <AdminOnly>
              <Link to="/monitors/new" className="btn-primary">
                <PlusIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                Create
              </Link>
            </AdminOnly>
          }
          title="Monitors"
          rowKey={(row) => row.id}
          filename="monitors.csv"
          defaultSort="name:asc"
          columns={[
            {
              key: 'name',
              label: 'Monitor',
              value: (row) => row.name,
              render: (row) => (
                <Link
                  className="font-medium text-blue-700 hover:underline dark:text-blue-300"
                  to={`/monitors/${row.id}`}
                >
                  {row.name}
                </Link>
              ),
            },
            {
              key: 'status',
              label: 'Health',
              value: (row) => statusName(row.status),
              render: (row) => <Badge status={row.status} />,
            },
            {
              key: 'service',
              label: 'Service',
              value: (row) => row.service,
            },
            { key: 'url', label: 'URL', value: (row) => row.url },
            {
              key: 'intervalMinutes',
              label: 'Interval (min)',
              value: (row) => row.intervalMinutes,
            },
            { key: 'method', label: 'Method', value: (row) => row.method || 'GET' },
            {
              key: 'durationMs',
              label: 'Latest duration (ms)',
              value: (row) => row.lastCheck?.durationMs ?? null,
            },
            {
              key: 'checkedAt',
              label: 'Last checked (UTC)',
              value: (row) => row.lastCheck?.checkedAt || '',
            },
          ]}
        />
      }
    </div>
  );
}
