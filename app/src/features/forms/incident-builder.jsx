import { Select } from '../../components/forms/select.jsx';
import { useUiPreferences } from '../../preferences/ui-preferences.jsx';
import { Toggle } from '../../components/forms/toggle.jsx';
import { RecordWorkspace } from '../../components/record-workspace.jsx';
import { ActionMenu } from '../../components/action-menu.jsx';
import React, { useContext, useState } from 'react';
import { ArrowUpIcon, ArrowDownIcon, PlusIcon } from '@heroicons/react/24/outline';
import { AuthContext } from '../../auth/auth-context.js';
import { useResource } from '../../data/use-resource.js';
import { Field, CustomField, Notice } from '../../components/forms/fields.jsx';
import { newId } from '../../lib/identifiers.js';
import { useSave } from '../../data/use-save.js';
import {
  builtinChoices,
  fieldChoices,
  optionLabel,
} from '../../../../shared/forms/form-options.js';
import { displayValue } from '../../lib/display-value.js';

/** Reorder without changing field or choice identity. */
function move(items, index, offset) {
  const next = [...items];
  [next[index], next[index + offset]] = [next[index + offset], next[index]];
  return next;
}
/** Native buttons make reordering usable with a keyboard. */
function Reorder({ index, length, onMove, label = 'item' }) {
  return (
    <span className="flex gap-1">
      <button
        type="button"
        className="btn-secondary !p-2"
        aria-label={`Move ${label} up`}
        disabled={!index}
        onClick={() => onMove(-1)}
      >
        <ArrowUpIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="btn-secondary !p-2"
        aria-label={`Move ${label} down`}
        disabled={index === length - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDownIcon className="h-4 w-4" />
      </button>
    </span>
  );
}
/** Custom choices can be hidden or removed; built-ins can only be hidden or relabeled. */
function OptionsEditor({ field, kind, onChange }) {
  const builtin = field.type === 'builtin',
    bases = builtinChoices[kind]?.[field.id];
  const options = builtin
    ? fieldChoices(kind, field)
    : field.options.map((value) => ({
        value,
        label: value,
        hidden: field.hiddenOptions?.includes(value),
      }));
  const [bulk, setBulk] = useState(''),
    [base, setBase] = useState(bases?.[0] || ''),
    [error, setError] = useState('');
  const commit = (next) =>
    builtin
      ? onChange({ choices: next })
      : onChange({
          options: next.map((option) => option.label),
          hiddenOptions: next.filter((option) => option.hidden).map((option) => option.label),
        });
  return (
    <div className="space-y-3">
      <h3 className="font-medium">Options</h3>
      {options.map((option, index) => (
        <div
          className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
          key={builtin ? option.value : index}
        >
          <label className="field-label">
            Option label
            <input
              value={option.label}
              maxLength={80}
              onChange={(event) =>
                commit(
                  options.map((row, i) =>
                    i === index ? { ...row, label: event.target.value } : row,
                  ),
                )
              }
            />
          </label>
          {builtin && (
            <label className="field-label">
              Workflow meaning
              <Select
                disabled={bases.includes(option.value)}
                value={option.base}
                onChange={(event) =>
                  commit(
                    options.map((row, i) =>
                      i === index ? { ...row, base: event.target.value } : row,
                    ),
                  )
                }
              >
                {bases.map((value) => (
                  <option key={value} value={value}>
                    {optionLabel(value)}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Reorder
              index={index}
              length={options.length}
              onMove={(offset) => commit(move(options, index, offset))}
            />
            <button
              type="button"
              className="btn-secondary"
              aria-pressed={option.hidden}
              onClick={() =>
                commit(
                  options.map((row, i) => (i === index ? { ...row, hidden: !row.hidden } : row)),
                )
              }
            >
              {option.hidden ? 'Show option' : 'Hide option'}
            </button>
            {(!builtin || !bases.includes(option.value)) && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => commit(options.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
      <label className="field-label">
        Quick add options (one per line)
        <textarea rows={3} value={bulk} onChange={(event) => setBulk(event.target.value)} />
      </label>
      {builtin && (
        <label className="field-label">
          Map new options to
          <Select value={base} onChange={(event) => setBase(event.target.value)}>
            {bases.map((value) => (
              <option key={value} value={value}>
                {optionLabel(value)}
              </option>
            ))}
          </Select>
        </label>
      )}
      <Notice error={error} />
      <button
        type="button"
        className="btn-secondary"
        onClick={() => {
          const labels = [
            ...new Set(
              bulk
                .split('\n')
                .map((value) => value.trim())
                .filter(Boolean),
            ),
          ];
          if (
            options.length + labels.length > (builtin ? 50 : 30) ||
            labels.some(
              (value) =>
                value.length > 80 ||
                options.some((option) => option.label.toLowerCase() === value.toLowerCase()),
            )
          ) {
            setError('Use unique labels up to 80 characters within the option limit.');
            return;
          }
          commit([
            ...options,
            ...labels.map((label) => ({
              value: builtin ? newId() : label,
              label,
              base,
              hidden: false,
            })),
          ]);
          setBulk('');
          setError('');
        }}
      >
        Add options
      </button>
    </div>
  );
}
/** One admin form builder for incidents, tasks, and knowledge. */
export function IncidentBuilderPage({ kind = 'incidents' }) {
  const { user } = useContext(AuthContext),
    path =
      kind === 'incidents'
        ? '/incident-fields'
        : kind === 'tasks'
          ? '/task-fields'
          : '/knowledge-fields';
  const resource = useResource(user?.role === 'admin' ? path : null);
  return (
    <div className="space-y-6">
      <h1 className="page-title">
        {kind === 'incidents' ? 'Incident' : kind === 'tasks' ? 'Task' : 'Knowledge'} form builder
      </h1>
      {user?.role !== 'admin' ? (
        <p>Workspace admin access is required.</p>
      ) : (
        <>
          <Notice error={resource.error} />
          {resource.data ? (
            <Builder
              key={kind}
              initial={resource.data}
              path={path}
              kind={kind}
              reload={resource.refresh}
            />
          ) : (
            <p role="status">Loading form settings…</p>
          )}
        </>
      )}
    </div>
  );
}
/** Keep unsaved settings stable during background query refreshes. */
function Builder({ initial, path, kind, reload }) {
  const [fields, setFields] = useState(initial.fields),
    [revision, setRevision] = useState(initial.revision),
    [savedIds, setSavedIds] = useState(initial.fields.map((field) => field.id)),
    [selected, setSelected] = useState(null),
    [preview] = useState({}),
    [saved, setSaved] = useState(false);
  const { rightCollapsed, setPreference } = useUiPreferences();
  /** Reveal the selected field without remounting or discarding the draft. */
  function selectField(id) {
    setSelected(id);
    if (rightCollapsed) setPreference('rightCollapsed', false);
  }
  const save = useSave(),
    field = fields.find((row) => row.id === selected);
  const update = (changes) => {
    if (save.busy) return;
    setSaved(false);
    setFields(fields.map((row) => (row.id === selected ? { ...row, ...changes } : row)));
  };
  return (
    <>
      <p className="text-sm text-slate-500">
        Built-in fields stay in the form. Rename or reorder them, and manage their dropdown choices.
        Built-in choices cannot be deleted; new choices map to a built-in meaning. Saved custom
        field types are locked.
      </p>
      <Notice error={save.error} />
      {saved && <p role="status">Form saved.</p>}
      <div className="flex flex-wrap gap-3">
        <button
          className="btn-primary"
          disabled={save.busy}
          onClick={() =>
            save.run(path, 'PUT', { fields, revision }, () => {
              setRevision(revision + 1);
              setSavedIds(fields.map((row) => row.id));
              setSaved(true);
            })
          }
        >
          {save.busy ? 'Saving…' : 'Save form'}
        </button>
        <ActionMenu label="Form builder actions">
          <button
            className="btn-secondary"
            disabled={save.busy}
            onClick={async () => {
              const result = await reload();
              if (result.data) {
                setFields(result.data.fields);
                setRevision(result.data.revision);
                setSavedIds(result.data.fields.map((row) => row.id));
                setSaved(false);
              }
            }}
          >
            Reload saved form
          </button>
        </ActionMenu>
        <button
          className="btn-secondary gap-2"
          disabled={save.busy || fields.filter((row) => row.type !== 'builtin').length >= 20}
          onClick={() => {
            const id = newId();
            setFields([
              ...fields,
              {
                id,
                label: 'New field',
                type: 'text',
                required: false,
                archived: false,
                options: [],
              },
            ]);
            selectField(id);
            setSaved(false);
          }}
        >
          <PlusIcon className="h-5 w-5" />
          Add custom field
        </button>
      </div>
      <RecordWorkspace
        label="Field settings"
        sidebar={
          <section className="panel form-body p-6">
            <h2 className="font-semibold">{field ? `Edit ${field.label}` : 'Field settings'}</h2>
            {!field && (
              <p className="text-sm text-slate-500">
                Select a field or add one to edit its settings.
              </p>
            )}
            {field && (
              <>
                <Field name="label" label="Label" errors={save.fields}>
                  <input
                    value={field.label}
                    maxLength={80}
                    onChange={(event) => update({ label: event.target.value })}
                  />
                </Field>
                <label className="flex items-center gap-2">
                  <Toggle
                    checked={field.required}
                    onChange={(event) => update({ required: event.target.checked })}
                  />
                  Required
                </label>
                {field.type === 'builtin' ? (
                  <p className="text-sm text-slate-500">
                    This field cannot be removed or have its type changed. Required can be enabled
                    or disabled.
                  </p>
                ) : (
                  <>
                    <Field name="type" label="Field type">
                      <Select
                        disabled={savedIds.includes(field.id)}
                        value={field.type}
                        onChange={(event) =>
                          update({ type: event.target.value, options: [], hiddenOptions: [] })
                        }
                      >
                        {['text', 'textarea', 'number', 'select', 'checkbox', 'date'].map(
                          (type) => (
                            <option key={type} value={type}>
                              {displayValue(type)}
                            </option>
                          ),
                        )}
                      </Select>
                    </Field>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        if (savedIds.includes(field.id)) update({ archived: !field.archived });
                        else {
                          setFields(fields.filter((row) => row.id !== field.id));
                          setSelected(null);
                          setSaved(false);
                        }
                      }}
                    >
                      {savedIds.includes(field.id)
                        ? field.archived
                          ? 'Restore field'
                          : 'Archive field'
                        : 'Remove field'}
                    </button>
                  </>
                )}
                {(field.type === 'select' || builtinChoices[kind]?.[field.id]) && (
                  <OptionsEditor key={field.id} kind={kind} field={field} onChange={update} />
                )}
              </>
            )}
          </section>
        }
      >
        <section className="panel space-y-4 p-5">
          <h2 className="font-semibold">Form fields</h2>
          <p className="text-sm text-slate-500">
            Select a field to configure it. Use its arrows to change the order.
          </p>
          {fields.map((row, index) => (
            <div
              key={row.id}
              className={`rounded-xl border p-4 ${row.id === selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-slate-200 dark:border-slate-700'}`}
              onClick={() => selectField(row.id)}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <button
                  type="button"
                  aria-pressed={row.id === selected}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block break-words font-medium">
                    {row.label}
                    {row.required ? ' *' : ''}
                  </span>
                  <span className="text-xs text-slate-500">
                    {row.archived ? 'Archived' : displayValue(row.type)}
                  </span>
                </button>
                <Reorder
                  label={row.label}
                  index={index}
                  length={fields.length}
                  onMove={(offset) => {
                    if (save.busy) return;
                    setFields(move(fields, index, offset));
                    setSelected(row.id);
                    setSaved(false);
                  }}
                />
              </div>
              <fieldset disabled aria-hidden="true" className="pointer-events-none min-w-0">
                {row.type === 'builtin' ? (
                  builtinChoices[kind]?.[row.id] ? (
                    <Select aria-label={`${row.label} preview`}>
                      {fieldChoices(kind, row)
                        .filter((option) => !option.hidden)
                        .map((option) => (
                          <option key={option.value}>{option.label}</option>
                        ))}
                    </Select>
                  ) : ['description', 'content'].includes(row.id) ? (
                    <textarea
                      aria-label={`${row.label} preview`}
                      rows={2}
                      placeholder={row.label}
                    />
                  ) : (
                    <input aria-label={`${row.label} preview`} placeholder={row.label} />
                  )
                ) : (
                  <CustomField field={row} value={preview[row.id]} onChange={() => {}} />
                )}
              </fieldset>
            </div>
          ))}
        </section>
      </RecordWorkspace>
    </>
  );
}
