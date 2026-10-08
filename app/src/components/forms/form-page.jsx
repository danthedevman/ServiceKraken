import React, { useContext } from 'react';
import { RecordActionContext } from '../record-actions.jsx';

/** Dedicated form surface shared by routed configuration and record editors. */
export function FormPage({ title, children }) {
  const record = useContext(RecordActionContext);
  return (
    <div className="form-page">
      {!record && <h1 className="page-title">{title}</h1>}
      <section className="record-details space-y-6">{children}</section>
    </div>
  );
}
