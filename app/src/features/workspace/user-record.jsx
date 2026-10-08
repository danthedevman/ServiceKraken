import { Select } from '../../components/forms/select.jsx';
import { Toggle } from '../../components/forms/toggle.jsx';
import React, { useContext, useState } from 'react';
import { AuthContext } from '../../auth/auth-context.js';
import { PrivateProfileSettings } from '../../auth/private-profile-settings.jsx';
import { RecordWorkspace, RecordMetadata } from '../../components/record-workspace.jsx';
import { RecordActions } from '../../components/record-actions.jsx';
import { Field, Notice } from '../../components/forms/fields.jsx';
import { StateBadge } from '../../components/state-badge.jsx';
import { useSave } from '../../data/use-save.js';
import { displayValue } from '../../lib/display-value.js';
import { ThemeToggle } from '../../preferences/theme.jsx';
import { USER_DETAIL_FIELDS, userDetails } from '../../../../shared/domain/user-details.js';

/** One directory record layout for profiles and workspace members; private controls are self-only. */
export function UserRecord({ member }) {
  const { user } = useContext(AuthContext);
  const own = member.id === user?.id;
  const [editing, setEditing] = useState(false);
  return (
    <RecordWorkspace
      item={member}
      kind="workspace"
      onEdit={!editing && (own || user?.role === 'admin') ? () => setEditing(true) : undefined}
      sidebar={<RecordMetadata item={member} />}
    >
      {editing ? (
        <UserDetailsForm member={member} own={own} onClose={() => setEditing(false)} />
      ) : (
        <section className="record-details">
          <dl className="grid gap-5 sm:grid-cols-2">
            {USER_DETAIL_FIELDS.map((field) => (
              <div key={field.key}>
                <dt>{field.label}</dt>
                <dd>{member[field.key] || 'Not set'}</dd>
              </div>
            ))}
            <div>
              <dt>Email</dt>
              <dd>{member.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{displayValue(member.role)}</dd>
            </div>
            <div>
              <dt>Access</dt>
              <dd>
                <StateBadge status={member.disabled ? 'disabled' : 'active'} />
              </dd>
            </div>
          </dl>
        </section>
      )}
      <p className="text-sm text-slate-500">
        On-call phone and time zone help teammates coordinate coverage. Schedules remain in UTC;
        adding a phone number does not enable SMS or voice notifications.
      </p>
      {own && !editing && (
        <section className="mt-8 space-y-5 border-t border-slate-200 pt-6 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm">Appearance</span>
            <ThemeToggle />
          </div>
          <PrivateProfileSettings member={member} />
        </section>
      )}
    </RecordWorkspace>
  );
}

/** Validate shared contact fields on both client and server while keeping access controls separate. */
function UserDetailsForm({ member, own, onClose }) {
  const save = useSave();
  const [value, setValue] = useState(member);
  const [errors, setErrors] = useState({});
  return (
    <form
      className="form-body"
      onSubmit={(event) => {
        event.preventDefault();
        try {
          const details = userDetails(value);
          setErrors({});
          save.run(
            own ? '/auth/details' : `/members/${member.id}`,
            'PATCH',
            own ? details : { ...details, role: value.role, disabled: !!value.disabled },
            onClose,
          );
        } catch (error) {
          setErrors(error.fields ?? {});
        }
      }}
    >
      <Notice error={save.error || Object.values(errors)[0]} />
      {USER_DETAIL_FIELDS.map((field) => (
        <Field
          key={field.key}
          name={field.key}
          label={`${field.label}${field.required ? ' *' : ''}`}
          errors={{ ...save.fields, ...errors }}
        >
          <input
            name={field.key}
            type={field.type || 'text'}
            required={field.required}
            maxLength={field.max}
            placeholder={field.placeholder}
            value={value[field.key] ?? ''}
            onChange={(event) => setValue({ ...value, [field.key]: event.target.value })}
          />
        </Field>
      ))}
      <div className="field-label">
        Email<span className="text-sm font-normal">{member.email}</span>
      </div>
      {!own && (
        <>
          <label className="field-label">
            Role
            <Select
              value={value.role}
              disabled={member.owner}
              onChange={(event) => setValue({ ...value, role: event.target.value })}
            >
              {['admin', 'responder', 'user', 'viewer'].map((role) => (
                <option key={role} value={role}>
                  {displayValue(role)}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2">
            <Toggle
              checked={!value.disabled}
              disabled={member.owner || !!member.demoBatchId}
              onChange={(event) => setValue({ ...value, disabled: !event.target.checked })}
            />
            Account enabled
          </label>
          <p className="text-sm text-slate-500">
            Saving signs this teammate out of existing sessions.
          </p>
        </>
      )}
      <RecordActions>
        <button type="button" className="btn-secondary" disabled={save.busy} onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" disabled={save.busy}>
          {save.busy ? 'Saving…' : 'Save changes'}
        </button>
      </RecordActions>
    </form>
  );
}
