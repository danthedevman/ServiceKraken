import { PlusIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { StateBadge } from '../../components/state-badge.jsx';
import { DataTable } from '../../components/data-table.jsx';
import { AdminOnly } from '../../auth/role-gates.jsx';

/** Catalog pages request only a server-filtered page, including health and relationship labels. */
export function CatalogPage({ kind = 'services' }) {
  const [params] = useSearchParams();
  const isService = kind === 'services';
  if (params.get('view'))
    return <Navigate replace to={`/${kind}/${encodeURIComponent(params.get('view'))}`} />;
  if (params.get('edit'))
    return (
      <Navigate
        replace
        to={
          params.get('edit') === 'new'
            ? `/${kind}/new`
            : `/${kind}/${encodeURIComponent(params.get('edit'))}/edit`
        }
      />
    );
  const columns = [
    {
      key: 'name',
      label: isService ? 'Service' : 'Collection',
      value: (row) => row.name,
      render: (row) => (
        <Link
          className="font-medium text-blue-700 hover:underline dark:text-blue-300"
          to={`/${kind}/${row.id}`}
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: 'health',
      label: 'Health',
      value: (row) => row.health,
      render: (row) => <StateBadge status={row.status} />,
    },
    ...(isService
      ? [
          ['description', 'Description'],
          ['monitors', 'Monitors'],
          ['owners', 'Owners'],
          ['contact', 'Primary contact'],
          ['dependencies', 'Dependencies'],
          ['collections', 'Collections'],
        ]
      : [['services', 'Services']]
    ).map(([key, label]) => ({ key, label, value: (row) => row[key] })),
  ];
  return (
    <div className="list-page">
      <DataTable
        source={kind}
        deletePath={`/${kind}`}
        fullPage
        secondaryActions={
          <Link className="btn-secondary" to={isService ? '/collections' : '/services'}>
            {isService ? 'Collections' : 'Services'}
          </Link>
        }
        actions={
          <AdminOnly>
            <Link className="btn-primary" to={`/${kind}/new`}>
              <PlusIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
              Add {isService ? 'service' : 'collection'}
            </Link>
          </AdminOnly>
        }
        title={isService ? 'Services' : 'Collections'}
        columns={columns}
        defaultSort="name:asc"
        filename={`${kind}.csv`}
      />
    </div>
  );
}
