import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { USER_DETAIL_FIELDS, userDetails } from '../../../../shared/domain/user-details.js';
import { fieldErrors } from '../../../../shared/validation/form-validation.js';
import { FormPage } from '../../components/forms/form-page.jsx';
import { Field, Notice } from '../../components/forms/fields.jsx';
import { Select } from '../../components/forms/select.jsx';
import { RecordActions } from '../../components/record-actions.jsx';
import { timeZoneOptions } from '../../lib/time-zones.js';
import { displayValue } from '../../lib/display-value.js';
import { useSave } from '../../data/use-save.js';
import { notify } from '../../data/toast.js';

/** Dedicated account forms keep credentials in memory and submit only on explicit confirmation. */
export function UserAccountForm({ reset = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const save = useSave();
  const [value, setValue] = useState({ role: 'user' });
  const [errors, setErrors] = useState({});
  const back = reset ? `/workspace/${id}` : '/workspace';
  const change = (key) => (event) => setValue({ ...value, [key]: event.target.value });
  const fields = { ...save.fields, ...errors };
  function submit(event) {
    event.preventDefault();
    let found = fieldErrors('auth', {
      email: reset ? 'reset@example.com' : value.email,
      password: value.password,
    });
    if (!reset) {
      try {
        userDetails(value);
      } catch (error) {
        found = { ...found, ...error.fields };
      }
    }
    if (value.password !== value.confirmPassword) found.confirmPassword = 'Passwords must match.';
    if (reset && !value.currentPassword) found.currentPassword = 'Enter your current password.';
    setErrors(found);
    if (Object.keys(found).length) {
      notify('Please correct the highlighted fields.', 'error');
      return;
    }
    save.run(
      reset ? `/members/${id}/password` : '/members',
      reset ? 'PATCH' : 'POST',
      value,
      (result) => navigate(reset ? back : `/workspace/${result.user.id}`),
    );
  }
  return (
    <FormPage title={reset ? 'Reset password' : 'Create user'}>
      <form noValidate className="form-body" onSubmit={submit}>
        <Notice error={save.error || Object.values(errors)[0]} />
        {!reset && (
          <>
            {USER_DETAIL_FIELDS.map((field) => (
              <Field
                key={field.key}
                name={field.key}
                label={`${field.label}${field.required ? ' *' : ''}`}
                errors={fields}
              >
                {field.key === 'timeZone' ? (
                  <Select
                    searchLabel="Search time zones"
                    value={value.timeZone ?? ''}
                    onChange={change('timeZone')}
                  >
                    <option value="">Use browser time zone</option>
                    {timeZoneOptions().map((zone) => (
                      <option key={zone.value} value={zone.value}>
                        {zone.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <input
                    name={field.key}
                    required={field.required}
                    type={field.type || 'text'}
                    maxLength={field.max}
                    value={value[field.key] ?? ''}
                    onChange={change(field.key)}
                  />
                )}
              </Field>
            ))}
            <Field name="email" label="Email *" errors={fields}>
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="off"
                value={value.email ?? ''}
                onChange={change('email')}
              />
            </Field>
            <Field name="role" label="Role *" errors={fields}>
              <Select value={value.role} onChange={change('role')}>
                {['user', 'viewer', 'responder', 'admin'].map((role) => (
                  <option key={role} value={role}>
                    {displayValue(role)}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
        {reset && (
          <>
            <p>
              Resetting this password signs the user out of all sessions. Share the new password
              privately.
            </p>
            <Field name="currentPassword" label="Your current password *" errors={fields}>
              <input
                type="password"
                required
                maxLength={128}
                autoComplete="current-password"
                value={value.currentPassword ?? ''}
                onChange={change('currentPassword')}
              />
            </Field>
          </>
        )}
        {!reset && (
          <p className="text-sm text-slate-500">
            Share the initial password privately. The user can change it in Profile settings.
          </p>
        )}
        <Field
          name="password"
          label={`${reset ? 'New' : 'Initial'} password (12–128 characters) *`}
          errors={fields}
        >
          <input
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            value={value.password ?? ''}
            onChange={change('password')}
          />
        </Field>
        <Field name="confirmPassword" label="Confirm password *" errors={fields}>
          <input
            type="password"
            required
            maxLength={128}
            autoComplete="new-password"
            value={value.confirmPassword ?? ''}
            onChange={change('confirmPassword')}
          />
        </Field>
        <RecordActions>
          <button
            type="button"
            className="btn-secondary"
            disabled={save.busy}
            onClick={() => navigate(back)}
          >
            Cancel
          </button>
          <button className="btn-primary" disabled={save.busy}>
            {save.busy ? 'Saving…' : reset ? 'Reset password' : 'Create user'}
          </button>
        </RecordActions>
      </form>
    </FormPage>
  );
}
