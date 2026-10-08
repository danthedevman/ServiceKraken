import React, { useEffect, useState } from 'react';
import { api } from '../../data/api.js';
import { Toggle } from '../../components/forms/toggle.jsx';

/** Keep email bearer tokens out of URLs after opening; require an explicit confirmation action. */
function readAction() {
  const match = /^#(confirm|unsubscribe)=([a-f\d]{64})$/.exec(window.location.hash);
  return match ? { kind: match[1], token: match[2] } : null;
}

/** Public opt-in controls work without a session, including unsubscribe on a private page. */
export function StatusSubscriptions({ token, capabilities }) {
  const [action, setAction] = useState(readAction);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const capture = () => {
      const next = readAction();
      if (next) {
        setAction(next);
        window.history.replaceState(
          window.history.state,
          '',
          window.location.pathname + window.location.search,
        );
      }
    };
    capture();
    window.addEventListener('hashchange', capture);
    return () => window.removeEventListener('hashchange', capture);
  }, []);
  useEffect(() => {
    if (!capabilities?.rssPath) return;
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.type = 'application/rss+xml';
    link.title = 'Service status updates';
    link.href = capabilities.rssPath;
    document.head.append(link);
    return () => link.remove();
  }, [capabilities?.rssPath]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api(
        `/public/status/${token}/subscriptions${action ? `/${action.kind}` : ''}`,
        {
          method: 'POST',
          body: action ? { token: action.token } : { email, consent },
        },
      );
      setMessage(result.message);
      setAction(null);
      setOpen(false);
      setEmail('');
      setConsent(false);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Status subscriptions" className="mb-6 space-y-4">
      <div className="flex flex-wrap gap-3">
        {capabilities?.emailEnabled && !action && (
          <button className="btn-secondary" aria-expanded={open} onClick={() => setOpen(!open)}>
            Subscribe by email
          </button>
        )}
        {capabilities?.rssPath && (
          <a className="btn-secondary" href={capabilities.rssPath}>
            RSS feed
          </a>
        )}
      </div>
      {(action || (open && capabilities?.emailEnabled)) && (
        <form
          onSubmit={submit}
          className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
        >
          {action ? (
            <p>
              {action.kind === 'confirm'
                ? 'Confirm your email subscription to public status updates.'
                : 'Stop receiving email updates from this status page.'}
            </p>
          ) : (
            <>
              <label className="field-label">
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Toggle checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                Send me service health changes and public announcements
              </label>
              <p className="text-sm text-slate-500">
                Confirm your address using the email we send. You can unsubscribe at any time.
              </p>
            </>
          )}
          <button className="btn-primary" disabled={busy || (!action && !consent)}>
            {busy
              ? 'Saving…'
              : action?.kind === 'unsubscribe'
                ? 'Unsubscribe'
                : action
                  ? 'Confirm subscription'
                  : 'Subscribe'}
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
    </section>
  );
}
