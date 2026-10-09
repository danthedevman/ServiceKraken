import { notify } from '../../data/toast.js';
import { FormSkeleton, Skeleton } from '../../components/skeleton.jsx';
import { Select } from '../../components/forms/select.jsx';
import { TableSearch } from '../../components/table-search.jsx';
import { StateBadge } from '../../components/state-badge.jsx';
import { mandatoryErrors } from '../../../../shared/forms/schema.js';
import { RecordActions } from '../../components/record-actions.jsx';
import { RecordTabs } from '../../components/record-tabs.jsx';
import { CancelButton } from '../../components/forms/cancel-button.jsx';
import {
  RecordWorkspace,
  RecordSection,
  RecordMetadata,
} from '../../components/record-workspace.jsx';
import { ActionMenu } from '../../components/action-menu.jsx';
import {
  AttachmentLinks,
  AttachmentPanel,
  AttachmentPicker,
  useAttachmentDraft,
} from '../files/attachments.jsx';

import {
  textDocument,
  embeddedImageIds,
  validateRichContent,
} from '../../../../shared/files/rich-content.js';
import { ReferenceField } from '../../components/forms/reference-field.jsx';
import { fieldChoices, recordFields } from '../../../../shared/forms/form-options.js';
import { displayValue } from '../../lib/display-value.js';
import React, { useContext, useEffect, useState, lazy, Suspense } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import { TASK_STATUSES, ARTICLE_STATUSES } from '../../../../shared/forms/work-options.js';
import { useResource } from '../../data/use-resource.js';
import { AuthContext } from '../../auth/auth-context.js';
import { DataTable } from '../../components/data-table.jsx';
import { downloadCsv } from '../../lib/csv-download.js';
import { AutoTextarea } from '../../components/forms/auto-textarea.jsx';
import { Field, CustomField, Notice } from '../../components/forms/fields.jsx';
import { useSave } from '../../data/use-save.js';

const RichEditor = lazy(() =>
  import('../files/rich-editor.jsx').then((module) => ({ default: module.RichEditor })),
);
const ArticleContent = lazy(() =>
  import('../files/rich-editor.jsx').then((module) => ({ default: module.ArticleContent })),
);

/** Friendly labels keep stored values stable for filtering and CSV reports. */
const label = displayValue;

/** Workspace indexes link to dedicated, bookmarkable creation forms. */
export function WorkPage({ kind = 'tasks' }) {
  const [params] = useSearchParams();
  if (params.get('create') === '1') {
    const next = new URLSearchParams(params);
    next.delete('create');
    return <Navigate replace to={`/${kind}/new?${next}`} />;
  }
  return (
    <WorkTable
      fullPage
      kind={kind}
      initialServiceId={params.get('serviceId') ?? ''}
      initialIncidentId={params.get('incidentId') ?? ''}
    />
  );
}
/** Standalone create page shares the same centered form layout as incidents. */
export function WorkCreatePage({ kind = 'tasks' }) {
  const [params] = useSearchParams(),
    navigate = useNavigate(),
    { user } = useContext(AuthContext);
  return (
    <div className="form-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Create {kind === 'tasks' ? 'Task' : 'Knowledge Article'}</h1>
        {user?.role === 'admin' && (
          <ActionMenu label="Form actions">
            <Link className="btn-secondary" to={`/${kind}/fields`}>
              Form builder
            </Link>
          </ActionMenu>
        )}
      </div>
      <WorkEditor
        page
        kind={kind}
        initialServiceId={params.get('serviceId') ?? ''}
        initialIncidentId={params.get('incidentId') ?? ''}
        onClose={() => navigate(`/${kind}`)}
      />
    </div>
  );
}

/** Shared remote tables paginate, filter, sort, refresh, and export the same server query. */
export function WorkTable({
  fullPage = false,
  kind = 'tasks',
  initialServiceId = '',
  initialIncidentId = '',
  create = false,
  onCreateClose,
  related = false,
}) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext),
    canEdit = ['admin', 'responder'].includes(user?.role);
  const task = kind === 'tasks';
  const [searchColumn, setSearchColumn] = useState('');
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('');
  const [serviceId, setService] = useState(initialServiceId),
    [page, setPage] = useState(1),
    [pageSize, setSize] = useState(10),
    [sort, setSort] = useState('updatedAt:desc');
  useEffect(() => {
    setService(initialServiceId);
    setPage(1);
  }, [initialServiceId, initialIncidentId]);
  const [sortBy, order] = sort.split(':');
  const query = new URLSearchParams({
    searchColumn,
    search,
    status,
    serviceId,
    incidentId: initialIncidentId,
    page,
    pageSize,
    sortBy,
    order,
  });
  const resource = useResource(`/${kind}?${query}`, 30000),
    services = useResource('/services');
  useEffect(() => {
    if (resource.data)
      setPage((p) => Math.min(p, Math.max(1, Math.ceil(resource.data.total / pageSize))));
  }, [resource.data, pageSize]);
  const change = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };
  const columns = [
    {
      key: 'title',
      label: task ? 'Task' : 'Article',
      value: (r) => r.title,
      render: (r) => (
        <Link className="text-blue-700 hover:underline dark:text-blue-300" to={`/${kind}/${r.id}`}>
          {r.title}
        </Link>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      value: (r) => r.statusLabel || label(r.status),
      render: (r) => <StateBadge status={r.status} label={r.statusLabel} />,
    },
    ...(task
      ? [
          {
            key: 'priority',
            label: 'Priority',
            value: (r) => r.priorityLabel || displayValue(r.priority),
            render: (r) => <StateBadge status={r.priority} label={r.priorityLabel} />,
          },
          { key: 'dueDate', label: 'Due date', value: (r) => r.dueDate },
        ]
      : []),
    {
      key: 'service',
      label: 'Service',
      sortable: false,
      value: (r) => r.serviceName || 'Unassigned',
    },
    ...(task
      ? [
          {
            key: 'assignmentGroupName',
            label: 'Assignment group',
            value: (r) => r.assignmentGroupName || 'Unassigned',
          },
          {
            key: 'assignee',
            label: 'Assigned to',
            sortable: false,
            value: (r) => r.assigneeName || 'Unassigned',
          },
        ]
      : []),
    {
      key: 'updatedAt',
      label: 'Updated (UTC)',
      value: (r) => r.updatedAt,
      render: (r) => new Date(r.updatedAt).toLocaleString('en-GB', { timeZone: 'UTC' }),
    },
  ];
  return (
    <div className={fullPage ? 'list-page' : 'space-y-4'}>
      <Notice error={resource.error || services.error} />
      <DataTable
        deletePath={`/${kind}`}
        fullPage={fullPage}
        actions={
          canEdit && (
            <button
              className="btn-primary gap-2"
              onClick={() =>
                navigate(
                  `/${kind}/new?${new URLSearchParams({ serviceId, incidentId: initialIncidentId })}`,
                )
              }
            >
              <PlusIcon className="h-5 w-5" />
              Create
            </button>
          )
        }
        title={task ? 'Tasks' : 'Knowledge'}
        rows={resource.data?.items ?? []}
        columns={columns}
        rowKey={(r) => r.id}
        remote={{
          filtersActive: Boolean(search || status || serviceId !== initialServiceId),
          page,
          pageSize,
          total: resource.data?.total ?? 0,
          sort,
          pending: resource.pending,
          loading: resource.loading,
          onPage: setPage,
          onPageSize: (n) => {
            setSize(n);
            setPage(1);
          },
          onSort: (value) => {
            setSort(value);
            setPage(1);
          },
          onRefresh: resource.refresh,
          onExport: (signal) => downloadCsv(`/${kind}/export?${query}`, `${kind}.csv`, signal),
        }}
        filters={
          <div className="flex flex-wrap items-end gap-4 p-6">
            <TableSearch
              columns={columns}
              search={search}
              column={searchColumn}
              onSearch={(value) => {
                setSearch(value);
                setPage(1);
              }}
              onColumn={(value) => {
                setSearchColumn(value);
                setPage(1);
              }}
            />
            <label className="field-label">
              Status
              <Select value={status} onChange={change(setStatus)}>
                <option value="">All active statuses</option>
                {(task ? TASK_STATUSES : ARTICLE_STATUSES).map((v) => (
                  <option key={v} value={v}>
                    {label(v)}
                  </option>
                ))}
              </Select>
            </label>
            {!related && (
              <label className="field-label">
                Service
                <Select value={serviceId} onChange={change(setService)}>
                  <option value="">All services</option>
                  {services.data?.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {(search || status || serviceId !== initialServiceId || sort !== 'updatedAt:desc') && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setSearch('');
                  setSearchColumn('');
                  setStatus('');
                  setService(initialServiceId);
                  setSort('updatedAt:desc');
                  setPage(1);
                }}
              >
                Reset filters and sorting
              </button>
            )}
          </div>
        }
      />
    </div>
  );
}

/** Authorized readers edit records in place; read-only roles retain the safe article renderer. */
export function WorkDetail({ kind = 'tasks' }) {
  const { user } = useContext(AuthContext),
    canEdit = ['admin', 'responder'].includes(user?.role);
  const { id } = useParams(),
    resource = useResource(`/${kind}/${id}`);
  const task = kind === 'tasks';
  const item = resource.data?.item;
  const [formVersion, setFormVersion] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const editing = editingId === useParams().id;
  const resetForm = () => {
    setEditingId(null);
    setFormVersion((value) => value + 1);
  };
  return (
    <div className="space-y-6">
      <Notice error={resource.error} />
      {!item ? (
        <p role="status">{resource.error ? 'Record unavailable.' : 'Loading details…'}</p>
      ) : (
        <>
          <RecordWorkspace
            item={item}
            kind={kind}
            onEdit={canEdit && !editing ? () => setEditingId(id) : undefined}
            sidebar={
              <>
                <RecordMetadata
                  item={item}
                  extra={[
                    ['Status', item.statusLabel || label(item.status)],
                    ...(task
                      ? [['Priority', item.priorityLabel || displayValue(item.priority)]]
                      : []),
                  ]}
                />
                {!task && (
                  <RecordSection title="Attachments">
                    <AttachmentPanel
                      compact
                      kind={kind}
                      recordId={item.id}
                      imageIds={embeddedImageIds(item.contentDocument)}
                    />
                  </RecordSection>
                )}
              </>
            }
          >
            {task && <AttachmentLinks kind="tasks" recordId={item.id} />}
            {canEdit && editing ? (
              <WorkEditor
                key={`${id}-${formVersion}`}
                kind={kind}
                item={item}
                onClose={resetForm}
              />
            ) : (
              <article className="record-details space-y-6">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt>Title</dt>
                    <dd>{item.title}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <StateBadge status={item.status} label={item.statusLabel} />
                    </dd>
                  </div>
                  {task && (
                    <div>
                      <dt>Priority</dt>
                      <dd>
                        <StateBadge status={item.priority} label={item.priorityLabel} />
                      </dd>
                    </div>
                  )}
                </dl>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-medium">Service</dt>
                    <dd>
                      {item.serviceId ? (
                        <Link
                          className="text-blue-700 dark:text-blue-300"
                          to={`/services/${item.serviceId}`}
                        >
                          {item.serviceName}
                        </Link>
                      ) : (
                        'Unassigned'
                      )}
                    </dd>
                  </div>
                  {task && (
                    <>
                      <div>
                        <dt className="font-medium">Incident</dt>
                        <dd>
                          {item.incidentId ? (
                            <Link
                              className="text-blue-700 dark:text-blue-300"
                              to={`/incidents/${item.incidentId}`}
                            >
                              {item.incidentTitle}
                            </Link>
                          ) : (
                            'Unassigned'
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium">Assignment group</dt>
                        <dd>{item.assignmentGroupName || 'Unassigned'}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Assigned to</dt>
                        <dd>{item.assigneeName || 'Unassigned'}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Due date</dt>
                        <dd>{item.dueDate || 'No due date'}</dd>
                      </div>
                    </>
                  )}
                </dl>
                {!task && (
                  <dl>
                    <div>
                      <dt>Summary</dt>
                      <dd className="whitespace-pre-wrap">{item.summary || '—'}</dd>
                    </div>
                  </dl>
                )}
                {task ? (
                  <dl>
                    <div>
                      <dt>Description</dt>
                      <dd className="whitespace-pre-wrap break-words">
                        {item.description || 'No description.'}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <section aria-label="Content">
                    <h2 className="field-label">Content</h2>
                    <Suspense fallback={<p role="status">Loading article…</p>}>
                      <ArticleContent document={item.contentDocument} text={item.content} />
                    </Suspense>
                  </section>
                )}
                <dl className="grid gap-4 sm:grid-cols-2">
                  {item.fields?.map((field) => (
                    <div key={field.id}>
                      <dt className="text-sm font-medium">{field.label}</dt>
                      <dd className="whitespace-pre-wrap break-words">
                        {String(item.custom?.[field.id] ?? '—')}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            )}
            {task && (
              <RecordTabs
                related
                tabs={[
                  {
                    id: 'attachments',
                    label: 'Attachments',
                    content: <AttachmentPanel kind="tasks" recordId={item.id} />,
                  },
                ]}
              />
            )}
          </RecordWorkspace>
        </>
      )}
    </div>
  );
}

/** Preserve legacy edit URLs while keeping a single record workspace. */
export function WorkEditPage({ kind = 'tasks' }) {
  const { id } = useParams();
  return <Navigate replace to={`/${kind}/${id}`} />;
}

/** Load choices without replacing the form during background refreshes. */
function WorkEditor({
  page = false,
  kind,
  item,
  initialServiceId = '',
  initialIncidentId = '',
  onClose,
}) {
  const services = useResource('/services'),
    members = useResource(kind === 'tasks' ? '/members' : null),
    save = useSave();
  const schema = useResource(kind === 'tasks' ? '/task-fields' : '/knowledge-fields');
  const ready = services.data && schema.data && (kind !== 'tasks' || members.data);
  const content = (
    <>
      {ready ? (
        <WorkForm
          schema={schema.data.fields}
          save={save}
          kind={kind}
          item={item}
          services={services.data.services}
          members={members.data?.members ?? []}
          initialServiceId={initialServiceId}
          initialIncidentId={initialIncidentId}
          onClose={onClose}
        />
      ) : (
        <>
          <Notice error={schema.error || services.error || members.error} />
          {!(schema.error || services.error || members.error) && (
            <FormSkeleton
              fields={
                schema.data?.fields ??
                (kind === 'tasks'
                  ? [
                      'title',
                      'description',
                      'status',
                      'priority',
                      'serviceId',
                      'incidentId',
                      'assigneeId',
                    ]
                  : ['title', 'content', 'status', 'serviceId']
                ).map((id) => ({ id }))
              }
            />
          )}
        </>
      )}
    </>
  );
  return <section className="record-details space-y-6">{content}</section>;
}

/** Schema-driven forms preserve stable types and map custom choices to canonical workflow values. */
function WorkForm({
  kind,
  item,
  services,
  members,
  initialServiceId,
  initialIncidentId,
  onClose,
  save,
  schema,
}) {
  const [clientErrors, setClientErrors] = useState({});
  const errors = { ...save.fields, ...clientErrors };
  const task = kind === 'tasks',
    navigate = useNavigate();
  const draft = useAttachmentDraft(kind, item?.id, item?.attachmentIds ?? []);
  const choiceDefault = (field) => {
    const options = fieldChoices(
      kind,
      schema.find((row) => row.id === field),
    );
    return (
      options.find(
        (row) =>
          !row.hidden && row.base === (field === 'status' ? (task ? 'todo' : 'draft') : 'medium'),
      )?.value ||
      options.find((row) => !row.hidden)?.value ||
      ''
    );
  };
  const [value, setValue] = useState(() => ({
    title: item?.title ?? '',
    statusOption: item?.statusOption ?? item?.status ?? choiceDefault('status'),
    serviceId: item?.serviceId ?? initialServiceId,
    custom: item?.custom ?? {},
    ...(task
      ? {
          description: item?.description ?? '',
          priorityOption: item?.priorityOption ?? item?.priority ?? choiceDefault('priority'),
          assignmentGroupId: item?.assignmentGroupId ?? '',
          assigneeId: item?.assigneeId ?? '',
          dueDate: item?.dueDate ?? '',
          incidentId: item?.incidentId ?? initialIncidentId,
        }
      : {
          summary: item?.summary ?? '',
          contentDocument: item?.contentDocument ?? textDocument(item?.content ?? ''),
        }),
  }));
  const [revision] = useState(item?.revision),
    [incidentSearch, setIncidentSearch] = useState('');
  const choices = useResource(
    task
      ? `/incidents?${new URLSearchParams({ search: incidentSearch, pageSize: '50', ...(value.serviceId ? { serviceId: value.serviceId } : {}) })}`
      : null,
  );
  const selected = useResource(task && value.incidentId ? `/incidents/${value.incidentId}` : null),
    incident = selected.data?.incident;
  const set = (name, next) => setValue((old) => ({ ...old, [name]: next }));
  const references = (field, options, selectedValue, change, extra = {}) => (
    <ReferenceField
      groupId={field.id === 'assigneeId' ? value.assignmentGroupId : undefined}
      referenceType={
        field.id === 'serviceId' ? 'services' : field.id === 'incidentId' ? 'incidents' : 'members'
      }
      key={field.id}
      label={field.label + (field.required ? ' *' : '')}
      options={options}
      value={selectedValue}
      onChange={change}
      error={errors[field.id]}
      {...extra}
    />
  );
  const custom = recordFields(schema, item?.fields);
  const layout = [
    ...schema.filter((field) => field.type === 'builtin' || !field.archived),
    ...custom.filter((field) => !schema.some((row) => row.id === field.id) && !field.archived),
  ];
  const control = (field) => {
    const name = field.id;
    if (field.type !== 'builtin')
      return (
        <CustomField
          key={name}
          field={field}
          value={value.custom[name]}
          errors={errors}
          onChange={(next) => set('custom', { ...value.custom, [name]: next })}
        />
      );
    if (name === 'serviceId')
      return references(
        field,
        services.map((row) => ({ id: row.id, label: row.name })),
        incident?.serviceId ?? value.serviceId,
        (next) => set(name, next),
        { disabled: task && !!value.incidentId },
      );
    if (name === 'assignmentGroupId')
      return (
        <ReferenceField
          key={name}
          referenceType="groups"
          label={field.label + (field.required ? ' *' : '')}
          value={value.assignmentGroupId}
          onChange={(next) =>
            setValue((old) => ({ ...old, assignmentGroupId: next, assigneeId: '' }))
          }
          error={errors[name]}
        />
      );
    if (name === 'assigneeId')
      return references(
        field,
        members
          .filter((row) => !row.disabled || row.id === value.assigneeId)
          .map((row) => ({ id: row.id, label: row.displayName || row.email })),
        value.assigneeId,
        (next) => set(name, next),
      );
    if (name === 'incidentId') {
      const list = choices.data?.incidents ?? [];
      return references(
        field,
        [
          ...(incident && !list.some((row) => row.id === incident.id) ? [incident] : []),
          ...list,
        ].map((row) => ({ id: row.id, label: row.title })),
        value.incidentId,
        (next) => {
          const found = list.find((row) => row.id === next);
          setValue((old) => ({
            ...old,
            incidentId: next,
            serviceId: found?.serviceId ?? old.serviceId,
          }));
        },
        { onSearch: setIncidentSearch },
      );
    }
    if (name === 'content')
      return (
        <section key={name} className="space-y-2">
          <h2 className="field-label">
            {field.label}
            {field.required ? ' *' : ''}
          </h2>
          <Suspense
            fallback={
              <span role="status" aria-label="Loading editor…">
                <Skeleton className="h-[300px] w-full" />
              </span>
            }
          >
            <RichEditor
              label={field.label}
              value={value.contentDocument}
              onChange={(document) => set('contentDocument', document)}
              uploadImage={(file) => draft.upload(file, { inline: true })}
              busy={draft.busy}
              error={errors.content}
            />
          </Suspense>
        </section>
      );
    let input;
    if (name === 'status' || name === 'priority') {
      const options = fieldChoices(kind, field),
        key = `${name}Option`,
        chosen = value[key];
      input = (
        <Select value={chosen} onChange={(event) => set(key, event.target.value)}>
          {chosen && !options.some((row) => row.value === chosen && !row.hidden) && (
            <option value={chosen}>
              {item?.[`${name}Label`] || label(item?.[name] || chosen)} (saved)
            </option>
          )}
          {options
            .filter((row) => !row.hidden)
            .map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
        </Select>
      );
    } else if (['description', 'summary', 'content'].includes(name))
      input = (
        <AutoTextarea
          minHeight={name === 'content' ? 220 : 96}
          maxHeight={name === 'content' ? 480 : 320}
          maxLength={name === 'content' ? 30000 : name === 'summary' ? 500 : 5000}
          value={value[name]}
          onChange={(event) => set(name, event.target.value)}
        />
      );
    else
      input = (
        <input
          type={name === 'dueDate' ? 'date' : 'text'}
          maxLength={160}
          value={value[name] ?? ''}
          onChange={(event) => set(name, event.target.value)}
        />
      );
    return (
      <Field
        key={name}
        name={name}
        label={field.label + (field.required ? ' *' : '')}
        errors={errors}
      >
        {input}
      </Field>
    );
  };
  return (
    <form
      noValidate
      className="form-body"
      onSubmit={(event) => {
        event.preventDefault();
        let content;
        try {
          content = !task
            ? validateRichContent(value.contentDocument, { required: false }).text
            : undefined;
        } catch (error) {
          setClientErrors(error.fields || { content: error.message });
          notify(error.message, 'error');
          return;
        }
        const required = mandatoryErrors(schema, {
          ...value,
          content,
          status: value.statusOption,
          priority: value.priorityOption,
        });
        setClientErrors(required);
        if (Object.keys(required).length) {
          notify('Please correct the highlighted fields.', 'error');
          return;
        }
        save.run(
          item ? `/${kind}/${item.id}` : `/${kind}`,
          item ? 'PATCH' : 'POST',
          {
            ...value,
            attachmentIds: draft.ids,
            ...(task && incident ? { serviceId: incident.serviceId } : {}),
            ...(item ? { revision } : {}),
          },
          (result) => {
            if (item) onClose();
            else navigate(`/${kind}/${result.item.id}`);
          },
        );
      }}
    >
      <Notice
        error={
          Object.keys(clientErrors).length
            ? 'Complete the required fields before saving.'
            : save.error || choices.error || selected.error
        }
      />

      {layout.map(control)}
      <AttachmentPicker draft={draft} imageIds={embeddedImageIds(value.contentDocument)} />
      <RecordActions>
        <CancelButton onCancel={onClose} to={`/${kind}`} disabled={save.busy} />
        <button
          className="btn-primary"
          disabled={save.busy || draft.busy || (task && !!value.incidentId && !incident)}
        >
          {save.busy ? 'Saving…' : item ? 'Save Changes' : `Create ${task ? 'Task' : 'Article'}`}
        </button>
      </RecordActions>
    </form>
  );
}
