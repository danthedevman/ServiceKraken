import { FormSkeleton } from '../../components/skeleton.jsx';
import { RecordActions } from '../../components/record-actions.jsx';
import { CancelButton } from '../../components/forms/cancel-button.jsx';
import { ReferenceField } from '../../components/forms/reference-field.jsx';

import { AutoTextarea } from '../../components/forms/auto-textarea.jsx';

import { writeApi } from '../../data/query-client.js';

import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ValidatedForm } from '../../components/forms/validated-form.jsx';
import { useCatalog } from './use-catalog.js';

/** Accessible multi-selection with explicit labels and normal keyboard controls. */
export function ServiceChoices({ services, selected, onChange, label, name }) {
  return (
    <ReferenceField
      referenceType={
        name === 'ownerIds' ? 'members' : name === 'ownerGroupIds' ? 'groups' : 'services'
      }
      label={label}
      name={name}
      multiple
      options={services.map((row) => ({ id: row.id, label: row.name }))}
      value={selected}
      onChange={onChange}
    />
  );
}

/** Collections are selected here; creation opens a dedicated page in another tab. */
export function CollectionField({ collections, value, onChange, disabled = false }) {
  return (
    <ReferenceField
      referenceType="collections"
      label="Collections"
      name="collectionIds"
      multiple
      options={collections.map((item) => ({ id: item.id, label: item.name }))}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

/** Create or update service definitions and collections without modifying monitor histories. */
export function CatalogForm({
  kind,
  item,
  services,
  collections,
  members,
  groups,
  onSaved,
  onCancel,
}) {
  const isService = kind === 'services';
  const [ownerIds, setOwnerIds] = useState(item?.ownerIds ?? []);
  const [ownerGroupIds, setOwnerGroupIds] = useState(item?.ownerGroupIds ?? []);
  const [contactId, setContactId] = useState(item?.primaryContactId ?? '');
  const [selected, setSelected] = useState(
    item?.[isService ? 'dependencyIds' : 'serviceIds'] ?? [],
  );
  const [collectionIds, setCollectionIds] = useState(
    collections
      .filter((collection) => collection.serviceIds.includes(item?.id))
      .map((collection) => collection.id),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** Submit bounded catalog fields; the server independently validates references and cycles. */
  async function submit(event, reportErrors) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const result = await writeApi(`/${kind}${item ? `/${item.id}` : ''}`, {
        method: item ? 'PATCH' : 'POST',
        body: {
          name: form.get('name'),
          ...(isService
            ? {
                description: form.get('description'),
                ownerIds,
                ownerGroupIds,
                primaryContactId: contactId,
                dependencyIds: selected,
                collectionIds,
              }
            : { serviceIds: selected }),
        },
      });
      onSaved(result.item);
    } catch (error) {
      setError(error.message);
      reportErrors?.(error.fields);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ValidatedForm kind={kind} className="form-body" onSubmit={submit}>
      {error && (
        <p role="alert" className="text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
      <label className="field-label">
        Name *
        <input
          autoFocus
          name="name"
          maxLength={80}
          required
          defaultValue={item?.name ?? ''}
          placeholder={isService ? 'Customer portal' : 'Production'}
        />
      </label>
      {isService && (
        <label className="field-label">
          Description
          <AutoTextarea
            name="description"
            maxLength={1000}
            defaultValue={item?.description ?? ''}
            placeholder="What this service provides"
          />
        </label>
      )}
      {isService && (
        <section className="space-y-5 border-t border-slate-200 pt-5 dark:border-slate-700">
          <h2 className="font-semibold">Ownership and contact</h2>
          <ServiceChoices
            name="ownerIds"
            label="Service owners"
            services={members
              .filter((m) => !m.disabled || ownerIds.includes(m.id))
              .map((m) => ({ id: m.id, name: m.displayName || m.email }))}
            selected={ownerIds}
            onChange={setOwnerIds}
          />
          <ServiceChoices
            name="ownerGroupIds"
            label="Owning groups"
            services={groups}
            selected={ownerGroupIds}
            onChange={setOwnerGroupIds}
          />
          <ReferenceField
            referenceType="members"
            label="Primary point of contact"
            name="primaryContactId"
            options={members
              .filter((member) => !member.disabled || member.id === contactId)
              .map((member) => ({ id: member.id, label: member.displayName || member.email }))}
            value={contactId}
            onChange={setContactId}
          />
        </section>
      )}
      <ServiceChoices
        name={isService ? 'dependencyIds' : 'serviceIds'}
        services={services.filter((service) => service.id !== item?.id || !isService)}
        selected={selected}
        onChange={setSelected}
        label={isService ? 'Depends on these services' : 'Services in this collection'}
      />
      {isService && (
        <CollectionField
          collections={collections}
          value={collectionIds}
          onChange={setCollectionIds}
          disabled={busy}
        />
      )}
      {isService && (
        <p className="field-hint">
          A dependency outage affects this service's current status. Cycles are not allowed. Add
          component names such as API or Checkout when assigning monitors.
        </p>
      )}
      <RecordActions>
        <CancelButton onCancel={onCancel} to={`/${kind}`} disabled={busy} />
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </RecordActions>
    </ValidatedForm>
  );
}

/** Dedicated create/edit page, preserving unsaved form values during ordinary rerenders. */
export function CatalogFormPage({ kind = 'services' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error } = useCatalog({ includeMonitors: false });
  const item = data?.[kind].find((entry) => entry.id === id);
  const noun = kind === 'services' ? 'service' : 'collection';
  if (id) return <Navigate replace to={`/${kind}/${id}`} />;
  return (
    <div className="form-page">
      <div>
        <h1 className="page-title">
          {id ? 'Edit' : 'Create'} {noun}
        </h1>
      </div>
      {error && (
        <p role="alert" className="text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
      {!data ? (
        error ? (
          <p>Could not load the editor.</p>
        ) : (
          <FormSkeleton
            fields={(kind === 'services'
              ? [
                  'name',
                  'description',
                  'ownerIds',
                  'ownerGroupIds',
                  'primaryContactId',
                  'dependencyIds',
                  'collectionIds',
                ]
              : ['name', 'serviceIds']
            ).map((id) => ({ id }))}
          />
        )
      ) : id && !item ? (
        <p role="alert">
          This {noun} no longer exists.{' '}
          <Link className="underline" to={`/${kind}`}>
            Return to {kind}
          </Link>
          .
        </p>
      ) : (
        <CatalogForm
          key={`${kind}-${id ?? 'new'}`}
          kind={kind}
          item={item}
          services={data.services}
          collections={data.collections}
          members={data.members}
          groups={data.groups}
          onSaved={(saved) => navigate(`/${kind}/${saved.id}`)}
          onCancel={() => navigate(id ? `/${kind}/${id}` : `/${kind}`)}
        />
      )}
    </div>
  );
}
