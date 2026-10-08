import React from 'react';
import { useNavigate } from 'react-router-dom';

/** Discard an edit through its owner; creation forms return to their owning list. */
export function CancelButton({ to, onCancel, disabled = false }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={disabled}
      onClick={() => {
        if (onCancel) onCancel();
        else navigate(to);
      }}
    >
      Cancel
    </button>
  );
}
