import { Select } from '../../components/forms/select.jsx';
import { UserRecord } from './user-record.jsx';
import { StateBadge } from '../../components/state-badge.jsx';
import { RecordActions } from '../../components/record-actions.jsx';
import { CancelButton } from '../../components/forms/cancel-button.jsx';
import { FormPage } from '../../components/forms/form-page.jsx';
import { displayValue } from '../../lib/display-value.js';
import React, { useContext, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../auth/auth-context.js';
import { setSessionUser } from '../../data/query-client.js';
import { useResource } from '../../data/use-resource.js';
import { DataTable } from '../../components/data-table.jsx';
import { Field, Notice } from '../../components/forms/fields.jsx';
import { useSave } from '../../data/use-save.js';

/** Accept a one-time invitation without exposing a token through an API GET URL. */
export function JoinPage() {
  const { token } = useParams(),
    navigate = useNavigate(),
    save = useSave(),
    [password, setPassword] = useState('');
  return (
    <main className="mx-auto max-w-lg space-y-6 p-8">
      <h1 className="page-title">Join your workspace</h1>
      <form
        noValidate
        className="panel space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.run('/auth/invite', 'POST', { token, password }, (result) => {
            setSessionUser(result.user);
            navigate('/', { replace: true });
          });
        }}
      >
        <p>Set a password to accept your invitation. Invitations expire after 48 hours.</p>
        <Notice error={save.error} />
        <Field name="password" label="Password (12–128 characters)" errors={save.fields}>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            minLength={12}
            maxLength={128}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <button className="btn-primary" disabled={save.busy}>
          {save.busy ? 'Joining…' : 'Join workspace'}
        </button>
        <Link className="block text-sm text-blue-600" to="/login">
          Sign in instead
        </Link>
      </form>
    </main>
  );
}
/** Admin-only membership lists with separate invite and edit pages. */
export function WorkspacePage({ form }) {
  const { id } = useParams(),
    navigate = useNavigate();
  const { user } = useContext(AuthContext),
    admin = user?.role === 'admin';
  const members = useResource(id ? '/members' : null),
    invitations = useResource(null),
    save = useSave();
  const [tab, setTab] = useState('members');
  const toolbar = (
    <nav aria-label="Workspace lists" className="flex gap-2 px-6 py-2">
      {['members', 'invitations'].map((value) => (
        <button
          key={value}
          className={`nav-link ${tab === value ? 'active' : ''}`}
          aria-pressed={tab === value}
          onClick={() => setTab(value)}
        >
          {value === 'members' ? 'Members' : 'Pending invitations'}
        </button>
      ))}
    </nav>
  );
  const actions = (
    <button className="btn-primary" onClick={() => navigate('/workspace/invite')}>
      Invite teammate
    </button>
  );
  if (!admin)
    return (
      <div className="space-y-6">
        <h1 className="page-title">Workspace users</h1>
        <p>Workspace admin access is required.</p>
      </div>
    );
  if (form === 'invite') return <InviteForm onClose={() => navigate('/workspace')} />;
  if (form === 'edit') return <Navigate replace to={`/workspace/${id}`} />;
  if (id) {
    const member = members.data?.members.find((row) => row.id === id);
    return (
      <div className="space-y-6">
        <Notice error={members.error} />
        {member ? (
          <UserRecord key={member.id} member={member} />
        ) : (
          <p role="status">{members.data ? 'Member not found.' : 'Loading member…'}</p>
        )}
      </div>
    );
  }
  return (
    <div className="list-page">
      <Notice error={save.error || members.error || invitations.error} />
      {tab === 'members' && (
        <DataTable
          fullPage
          loading={!members.data}
          actions={actions}
          secondaryActions={
            <Link className="btn-secondary" to="/groups">
              Manage groups
            </Link>
          }
          toolbar={toolbar}
          title="Workspace users"
          rows={members.data?.members ?? []}
          rowKey={(r) => r.id}
          filename="workspace-members.csv"
          source="members"
          deletePath="/members"
          onRefresh={members.refresh}
          columns={[
            {
              key: 'displayName',
              label: 'Name',
              value: (r) => r.displayName,
              render: (r) => (
                <Link className="text-blue-700 dark:text-blue-300" to={`/workspace/${r.id}`}>
                  {r.displayName || r.email}
                </Link>
              ),
            },
            { key: 'email', label: 'Email', value: (r) => r.email },
            {
              key: 'role',
              label: 'Role',
              value: (r) => (r.owner ? 'Admin (owner)' : displayValue(r.role)),
            },
            {
              key: 'disabled',
              label: 'Access',
              value: (r) => (r.disabled ? 'Disabled' : 'Active'),
              render: (r) => <StateBadge status={r.disabled ? 'disabled' : 'active'} />,
            },
            {
              key: 'actions',
              label: 'Actions',
              sortable: false,
              value: () => '',
              render: (r) =>
                !r.owner && (
                  <button
                    className="btn-secondary"
                    onClick={() => navigate(`/workspace/${r.id}/edit`)}
                  >
                    Edit
                  </button>
                ),
            },
          ]}
        />
      )}
      {tab === 'invitations' && (
        <DataTable
          fullPage
          loading={!invitations.data}
          actions={actions}
          secondaryActions={
            <Link className="btn-secondary" to="/groups">
              Manage groups
            </Link>
          }
          toolbar={toolbar}
          title="Workspace users"
          rows={invitations.data?.invitations ?? []}
          rowKey={(r) => r.id}
          filename="invitations.csv"
          source="invitations"
          deletePath="/invitations"
          onRefresh={invitations.refresh}
          columns={[
            { key: 'email', label: 'Email', value: (r) => r.email },
            { key: 'role', label: 'Role', value: (r) => displayValue(r.role) },
            { key: 'expiresAt', label: 'Expires (UTC)', value: (r) => r.expiresAt },
            {
              key: 'actions',
              label: 'Actions',
              sortable: false,
              value: () => '',
              render: (r) => (
                <button
                  disabled={save.busy}
                  className="btn-secondary"
                  onClick={() => save.run(`/invitations/${r.id}`, 'DELETE', {})}
                >
                  Revoke
                </button>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

/** Role labels and descriptions are shared by invitation and membership editing. */
function RoleField({ value, onChange, errors }) {
  return (
    <>
      <Field name="role" label="Role" errors={errors}>
        <Select value={value} onChange={onChange}>
          <option value="user">User</option>
          <option value="viewer">Viewer</option>
          <option value="responder">Responder</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>
      <p className="text-sm text-slate-500">
        Users submit incidents and view those opened by or for them. Viewers can read all
        operational data. Responders manage incidents, tasks, and articles. Admins also manage
        configuration and membership.
      </p>
    </>
  );
}

/** Keep the one-time invitation link visible until the admin dismisses the dialog. */
function InviteForm({ onClose }) {
  const save = useSave(),
    [email, setEmail] = useState(''),
    [displayName, setName] = useState(''),
    [role, setRole] = useState('user'),
    [inviteUrl, setUrl] = useState('');
  return (
    <FormPage title="Invite teammate">
      {inviteUrl ? (
        <div className="space-y-4">
          <p role="status">
            Invitation created. Share this link privately with your teammate; it expires in 48
            hours.
          </p>
          <label className="field-label">
            Invitation link — shown once
            <input readOnly value={inviteUrl} onFocus={(e) => e.target.select()} />
          </label>
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form
          noValidate
          className="form-body"
          onSubmit={(e) => {
            e.preventDefault();
            save.run('/invitations', 'POST', { email, displayName, role }, (result) =>
              setUrl(result.inviteUrl),
            );
          }}
        >
          <Notice error={save.error} />
          <Field name="displayName" label="Name *" errors={save.fields}>
            <input
              required
              autoFocus
              value={displayName}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </Field>
          <Field name="email" label="Email *" errors={save.fields}>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
            />
          </Field>
          <RoleField value={role} onChange={(e) => setRole(e.target.value)} errors={save.fields} />
          <RecordActions>
            <CancelButton onCancel={onClose} to={'/workspace'} disabled={save.busy} />
            <button className="btn-primary" disabled={save.busy}>
              {save.busy ? 'Creating…' : 'Create invitation'}
            </button>
          </RecordActions>
        </form>
      )}
    </FormPage>
  );
}
