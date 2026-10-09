import React, { useContext } from 'react';
import { AuthContext } from './auth-context.js';

/** Hide administrative controls for responders; the API remains the authority. */
export function AdminOnly({ children, page = false }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  return user?.role === 'admin' ? (
    children
  ) : page ? (
    <p>Workspace admin access is required.</p>
  ) : null;
}

/** Operational editors are available to responders and admins, never read-only users. */
export function ResponderOnly({ children, page = false }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  return ['admin', 'responder'].includes(user?.role) ? (
    children
  ) : page ? (
    <p>Responder or admin access is required.</p>
  ) : null;
}

/** Users can submit incidents; viewers cannot create or modify operational records. */
export function IncidentCreatorOnly({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  return ['admin', 'responder', 'user'].includes(user?.role) ? (
    children
  ) : (
    <p>Your role cannot create incidents.</p>
  );
}
