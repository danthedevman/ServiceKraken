import { Select } from '../components/forms/select.jsx';
import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './auth-context.js';
import { writeApi, setSessionUser } from '../data/query-client.js';
import { displayValue } from '../lib/display-value.js';

/** Admin role previews use real API permissions and retain the signed-in person's identity. */
export function RolePreview({ banner = false }) {
  const { user } = useContext(AuthContext),
    navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if ((user?.actualRole ?? user?.role) !== 'admin' || (banner && !user.impersonating)) return null;
  async function change(role) {
    setBusy(true);
    setError('');
    try {
      const result = await writeApi('/auth/role', { method: 'POST', body: { role } });
      setSessionUser(result.user);
      // Other tabs discard their old role's data before loading the updated session.
      try {
        localStorage.setItem('servicekraken-role-change', String(Date.now()));
      } catch {
        /* Storage may be disabled. */
      }
      navigate('/', { replace: true });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className={
        banner
          ? 'role-preview flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950'
          : 'space-y-2 px-3 py-2'
      }
    >
      {banner ? (
        <>
          <span>Viewing as {displayValue(user.role)} · Your account identity is unchanged.</span>
          <button className="btn-secondary" disabled={busy} onClick={() => change('admin')}>
            {busy ? 'Switching…' : 'Return to Admin'}
          </button>
        </>
      ) : (
        <>
          <label className="field-label">
            View as role
            <Select
              value={user.role}
              disabled={busy}
              onChange={(event) => change(event.target.value)}
            >
              {['admin', 'responder', 'viewer', 'user'].map((role) => (
                <option key={role} value={role}>
                  {displayValue(role)}
                </option>
              ))}
            </Select>
          </label>
          <p className="text-xs text-slate-500">Actions are real and use your account.</p>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
