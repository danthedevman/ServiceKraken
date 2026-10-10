import React, { useRef, useState } from 'react';
import { Modal } from './modal.jsx';

/** Require explicit confirmation before invoking a destructive action; Cancel is the initial focus. */
export function ConfirmDeleteButton({
  children,
  onConfirm,
  confirmation = 'Remove this item? This action cannot be undone.',
  confirmLabel = 'Delete',
  title = 'Confirm Removal',
  busyLabel = 'Removing…',
  confirmClassName = 'btn-danger',
  disabled,
  ...props
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cancel = useRef(null);
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      setOpen(false);
    } catch (failure) {
      setError(failure.message || 'The item could not be removed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button {...props} type="button" disabled={disabled || busy} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <Modal
          title={title}
          busy={busy}
          initialFocusRef={cancel}
          onClose={() => setOpen(false)}
          footer={
            <>
              <button
                ref={cancel}
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className={confirmClassName} disabled={busy} onClick={confirm}>
                {busy ? busyLabel : confirmLabel}
              </button>
            </>
          }
        >
          <p>{confirmation}</p>
          {error && (
            <p role="alert" className="mt-3 text-rose-700 dark:text-rose-400">
              {error}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
