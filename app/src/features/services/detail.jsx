import { PlusIcon } from '@heroicons/react/24/outline';
import { RecordTabs } from '../../components/record-tabs.jsx';
import { IncidentsPage } from '../incidents/incidents.jsx';
import { WorkTable } from '../work/work.jsx';
import { StateBadge } from '../../components/state-badge.jsx';
import { AuthContext } from '../../auth/auth-context.js';

import { RecordWorkspace, RecordMetadata } from '../../components/record-workspace.jsx';

import { DataTable } from '../../components/data-table.jsx';

import { Modal } from '../../components/modal.jsx';

import { AdminOnly } from '../../auth/role-gates.jsx';
import { useResource } from '../../data/use-resource.js';
import { writeApi } from '../../data/query-client.js';

import React, { useContext, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useCatalog } from './use-catalog.js';

import { CatalogForm } from './form.jsx';

/** Bookmarkable record view shared by services and collections. */
export function CatalogDetailPage({ kind = 'services' }) {
  const [formVersion, setFormVersion] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const editing = editingId === useParams().id;
  const resetForm = () => {
    setEditingId(null);
    setFormVersion((value) => value + 1);
  };
  const { user } = useContext(AuthContext);
  const { id } = useParams(),
    navigate = useNavigate();
  const { data, error } = useCatalog({ includeMonitors: false }),
    health = useResource('/status', 30000);
  const [confirmDelete, setConfirmDelete] = useState(null),
    [busy, setBusy] = useState(false),
    [actionError, setError] = useState('');
  const selected = data?.[kind].find((item) => item.id === id),
    isService = kind === 'services';
  const statusLabel = (status) =>
    ({
      up: 'Operational',
      down: 'Down',
      degraded: 'Degraded',
      unknown: 'Unknown',
      paused: 'Paused',
      pending: 'Awaiting check',
    })[status] || 'Unknown';
  const state = (item) =>
    health.data?.[kind]?.find((row) => row.id === item.id)?.status || 'unknown';
  const names = (ids) =>
    ids
      .map(
        (value) => data.services.find((service) => service.id === value)?.name || 'Deleted service',
      )
      .join(', ') || 'None';
  async function remove() {
    setBusy(true);
    setError('');
    try {
      await writeApi(`/${kind}/${id}`, { method: 'DELETE', body: {} });
      navigate(`/${kind}`, { replace: true });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      {(error || health.error) && (
        <p role="alert" className="text-rose-700 dark:text-rose-400">
          {error || health.error}
        </p>
      )}
      {!data ? (
        <p role="status" className="sr-only">
          Loading record…
        </p>
      ) : !selected ? (
        <p role="alert">This record no longer exists or is unavailable.</p>
      ) : (
        <RecordWorkspace
          item={selected}
          kind={kind}
          status={state(selected)}
          onEdit={user?.role === 'admin' && !editing ? () => setEditingId(id) : undefined}
          secondaryActions={
            (isService || user?.role === 'admin') && (
              <>
                {isService && (
                  <>
                    <AdminOnly>
                      <Link to={`/monitors/new?serviceId=${selected.id}`}>Create Monitor</Link>
                    </AdminOnly>
                    <Link to={`/tasks?serviceId=${selected.id}`}>View tasks</Link>
                    <Link to={`/knowledge?serviceId=${selected.id}`}>View knowledge</Link>
                  </>
                )}
                <AdminOnly>
                  <button className="btn-danger" onClick={() => setConfirmDelete(selected)}>
                    Delete
                  </button>
                </AdminOnly>
              </>
            )
          }
          sidebar={
            <>
              <RecordMetadata
                item={selected}
                extra={[
                  ['Health', statusLabel(state(selected))],
                  ['Type', isService ? 'Service' : 'Collection'],
                ]}
              />
            </>
          }
        >
          {user?.role === 'admin' && editing && (
            <CatalogForm
              key={`${id}-${formVersion}`}
              kind={kind}
              item={selected}
              services={data.services}
              collections={data.collections}
              members={data.members}
              groups={data.groups}
              onSaved={resetForm}
              onCancel={resetForm}
            />
          )}
          <section hidden={editing} className="record-details space-y-6">
            <dl className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt>Name</dt>
                <dd>{selected.name}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt>Description</dt>
                <dd className="whitespace-pre-wrap">{selected.description || 'No description.'}</dd>
              </div>
              <div>
                <dt>Health</dt>
                <dd>
                  <StateBadge status={state(selected)} />
                </dd>
              </div>
              <div>
                <dt>{isService ? 'Dependencies' : 'Services'}</dt>
                <dd>{names(selected[isService ? 'dependencyIds' : 'serviceIds'])}</dd>
              </div>
            </dl>
            {isService && (
              <>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt>Manual health flag</dt>
                    <dd>
                      {selected.healthPolicy?.manualDown
                        ? 'Down'
                        : selected.healthPolicy?.manualDegraded
                          ? 'Degraded'
                          : 'None'}
                    </dd>
                  </div>
                  <div>
                    <dt>Degraded response time</dt>
                    <dd>
                      {selected.healthPolicy?.responseTimeMs
                        ? `${selected.healthPolicy.responseTimeMs} ms`
                        : 'Disabled'}
                    </dd>
                  </div>
                  <div>
                    <dt>Consecutive failures before Down</dt>
                    <dd>{selected.healthPolicy?.failuresBeforeDown ?? 1}</dd>
                  </div>
                </dl>
                <ServiceOwnership service={selected} members={data.members} groups={data.groups} />
                <dl>
                  <div>
                    <dt>Collections</dt>
                    <dd>
                      {data.collections
                        .filter((collection) => collection.serviceIds.includes(selected.id))
                        .map((collection) => collection.name)
                        .join(', ') || 'None'}
                    </dd>
                  </div>
                </dl>

                <RecordTabs
                  related
                  key={selected.id}
                  lazy
                  label="Service related records"
                  tabs={[
                    {
                      id: 'incidents',
                      label: 'Incidents',
                      content: <IncidentsPage initialServiceId={selected.id} related />,
                    },
                    {
                      id: 'tasks',
                      label: 'Tasks',
                      content: <WorkTable kind="tasks" initialServiceId={selected.id} related />,
                    },
                    {
                      id: 'knowledge',
                      label: 'Knowledge',
                      content: (
                        <WorkTable kind="knowledge" initialServiceId={selected.id} related />
                      ),
                    },
                    {
                      id: 'monitors',
                      label: 'Monitors',
                      content: <ServiceMonitors serviceId={selected.id} />,
                    },
                  ]}
                />
              </>
            )}
          </section>
        </RecordWorkspace>
      )}
      {confirmDelete && (
        <Modal
          title={`Delete ${isService ? 'service' : 'collection'}?`}
          onClose={() => setConfirmDelete(null)}
          busy={busy}
          footer={
            <div className="flex flex-wrap gap-3">
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button className="btn-danger" disabled={busy} onClick={remove}>
                Confirm delete
              </button>
            </div>
          }
        >
          <p>Delete {confirmDelete.name}? Related monitors, events, and services will be kept.</p>
          {actionError && <p role="alert">{actionError}</p>}
        </Modal>
      )}
    </div>
  );
}

/** Resolve private ownership references without exposing member details on public status pages. */
export function ServiceOwnership({ service, members = [], groups = [] }) {
  const name = (id) => {
    const member = members.find((m) => m.id === id);
    return member
      ? `${member.displayName || member.email}${member.disabled ? ' (disabled)' : ''}`
      : 'Unavailable member';
  };
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="font-medium">Owners</dt>
        <dd>{service.ownerIds?.map(name).join(', ') || 'Unassigned'}</dd>
      </div>
      <div>
        <dt className="font-medium">Owning groups</dt>
        <dd>
          {service.ownerGroupIds
            ?.map((id) => groups.find((g) => g.id === id)?.name || 'Unavailable group')
            .join(', ') || 'Unassigned'}
        </dd>
      </div>
      <div>
        <dt className="font-medium">Primary contact</dt>
        <dd>{service.primaryContactId ? name(service.primaryContactId) : 'Unassigned'}</dd>
      </div>
    </dl>
  );
}

/** Fetch monitor records only after the service monitor tab is opened. */
function ServiceMonitors({ serviceId }) {
  return (
    <div className="space-y-4">
      <DataTable
        source={`monitors?serviceId=${serviceId}`}
        deletePath="/monitors"
        title="Service Monitors"
        actions={
          <AdminOnly>
            <Link className="btn-primary" to={`/monitors/new?serviceId=${serviceId}`}>
              <PlusIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
              Create
            </Link>
          </AdminOnly>
        }
        rowKey={(row) => row.id}
        filename="service-monitors.csv"
        columns={[
          {
            key: 'name',
            label: 'Monitor',
            value: (row) => row.name,
            render: (row) => (
              <Link className="text-blue-700 dark:text-blue-300" to={`/monitors/${row.id}`}>
                {row.name}
              </Link>
            ),
          },
          {
            key: 'status',
            label: 'Health',
            value: (row) =>
              ({ up: 'Operational', down: 'Down', degraded: 'Degraded', paused: 'Paused' })[
                row.status
              ] || 'Unknown',
          },
          {
            key: 'component',
            label: 'Component',
            value: (row) => row.component || 'General',
          },
        ]}
      />
    </div>
  );
}
