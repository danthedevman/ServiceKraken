import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useResource } from '../../data/use-resource.js';
import { Notice } from '../../components/forms/fields.jsx';
import { useSave } from '../../data/use-save.js';
import { DataTable } from '../../components/data-table.jsx';
import { Modal } from '../../components/modal.jsx';
import { validateDemoAction } from '../../../../shared/domain/demo-data.js';

/** Admin-only dataset lifecycle. The API independently validates access, batch identity, and single-add state. */
export function SettingsPage() {
  const resource = useResource('/settings/demo-data', 3000),
    save = useSave();
  const marketing = useResource('/settings/marketing');
  const inbox = useResource(null);
  const [confirm, setConfirm] = useState(false),
    [message, setMessage] = useState(''),
    [clientError, setClientError] = useState('');
  const batch = resource.data?.batch,
    working = batch && ['creating', 'deleting'].includes(batch.status) && !batch.recoverable;
  function run(action) {
    if (
      save.busy ||
      working ||
      !resource.data ||
      (action === 'add' && batch) ||
      (action === 'delete' && !batch)
    )
      return;
    const body = {
      confirmation: action === 'add' ? 'ADD DEMO DATA' : 'DELETE DEMO DATA',
      ...(action === 'delete' ? { batchId: batch.batchId } : {}),
    };
    setClientError('');
    setMessage('');
    try {
      validateDemoAction(action, body);
    } catch (error) {
      setClientError(error.message);
      return;
    }
    save.run('/settings/demo-data', action === 'add' ? 'POST' : 'DELETE', body, () => {
      setConfirm(false);
      setMessage(
        action === 'add'
          ? 'Demo data added.'
          : 'Demo data deleted. Your other records were retained.',
      );
    });
  }
  return (
    <div className="space-y-6">
      <h1 className="page-title">Settings</h1>
      <section className="panel space-y-4 p-6">
        <h2 className="text-lg font-semibold">Audit log</h2>
        <p>
          Review record activity, including who performed an action and when. Search, filter by
          date, and export matching entries.
        </p>
        <Link className="btn-primary" to="/settings/audit">
          View audit log
        </Link>
      </section>
      <section className="panel space-y-4 p-6">
        <h2 className="text-lg font-semibold">Communication apps</h2>
        <p>
          Connect email, Slack, Microsoft Teams, or ServiceNow and choose where service-impact
          notifications go.
        </p>
        <Link className="btn-primary" to="/integrations">
          Manage integrations
        </Link>
      </section>
      <section className="panel space-y-4 p-6">
        <h2 className="text-lg font-semibold">Demo data</h2>
        <p>
          Add 50 records of each type listed below. Only one demo dataset can exist in a workspace;
          delete it before adding another.
        </p>
        <p className="text-sm text-slate-500">
          Demo users cannot sign in, monitors remain paused, and integrations cannot send messages.
          No real emails or requests are sent. Demo records do not consume normal record quotas. New
          comments and files attached to demo incidents are also demo data.
        </p>
        <Notice error={resource.error || save.error || clientError} />
        {message && <p role="status">{message}</p>}
        {!resource.data ? (
          <p role="status">Loading demo-data settings…</p>
        ) : (
          <>
            <p role="status">
              {working
                ? 'Updating demo data…'
                : batch?.status === 'failed' || batch?.recoverable
                  ? 'An interrupted operation needs cleanup. Use Delete demo data before adding again.'
                  : batch
                    ? 'Demo data is installed.'
                    : 'No demo data installed.'}
            </p>
            {batch && (
              <p className="text-sm text-slate-500">
                Added by {batch.createdBy} · {new Date(batch.createdAt).toLocaleString()}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                className="btn-primary"
                disabled={save.busy || working || !!batch}
                onClick={() => run('add')}
              >
                {save.busy && !confirm ? 'Adding…' : 'Add demo data'}
              </button>
              <button
                className="btn-secondary"
                disabled={save.busy || working || !batch}
                onClick={() => setConfirm(true)}
              >
                Delete demo data
              </button>
            </div>
          </>
        )}
      </section>
      <DataTable
        source="demo"
        title="Demo dataset"
        rows={resource.data?.types ?? []}
        rowKey={(row) => row.key}
        filename="demo-data-types.csv"
        columns={[
          { key: 'label', label: 'Record type', value: (row) => row.label },
          { key: 'count', label: 'Records added', value: (row) => row.count },
        ]}
      />
      {marketing.data?.available && (
        <>
          <Notice error={inbox.error} />
          <DataTable
            source="inquiries"
            title="Hosting inquiries"
            rows={inbox.data?.inquiries ?? []}
            loading={!inbox.data}
            rowKey={(row) => row.id}
            defaultSort="createdAt:desc"
            filename="hosting-inquiries.csv"
            deletePath="/settings/marketing/inquiries"
            description="Inquiries are retained for 90 days."
            columns={[
              { key: 'createdAt', label: 'Received (UTC)', value: (row) => row.createdAt },
              { key: 'name', label: 'Name', value: (row) => row.name },
              { key: 'email', label: 'Email', value: (row) => row.email },
              { key: 'company', label: 'Organization', value: (row) => row.company },
              { key: 'interest', label: 'Interest', value: (row) => row.interest },
              {
                key: 'message',
                label: 'Message',
                value: (row) => row.message,
                className: 'whitespace-pre-wrap max-w-sm',
              },
              {
                key: 'actions',
                label: 'Actions',
                sortable: false,
                value: () => '',
                render: (row) => (
                  <button
                    type="button"
                    disabled={save.busy}
                    onClick={() =>
                      save.run(`/settings/marketing/inquiries/${row.id}`, 'DELETE', {})
                    }
                  >
                    Delete inquiry
                  </button>
                ),
              },
            ]}
          />
        </>
      )}
      {confirm && (
        <Modal
          title="Delete demo data?"
          busy={save.busy}
          onClose={() => setConfirm(false)}
          footer={
            <>
              <button
                className="btn-secondary"
                disabled={save.busy}
                onClick={() => setConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={save.busy || working || !batch}
                onClick={() => run('delete')}
              >
                {save.busy ? 'Deleting…' : 'Delete demo data'}
              </button>
            </>
          }
        >
          <p>
            Delete all records in this demo dataset, including edits and files added to those demo
            records. Other records are retained. References from other records to deleted demo items
            may become unavailable.
          </p>
          <Notice error={save.error} />
        </Modal>
      )}
    </div>
  );
}
