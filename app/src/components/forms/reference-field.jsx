import { useResource } from '../../data/use-resource.js';
import React, { useContext, useEffect, useId, useRef, useState } from 'react';
import {
  InformationCircleIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../auth/auth-context.js';

const recordRoutes = {
  services: '/services',
  collections: '/collections',
  groups: '/groups',
  members: '/workspace',
  incidents: '/incidents',
  knowledge: '/knowledge',
  tasks: '/tasks',
  monitors: '/monitors',
};

const destinations = {
  knowledge: { href: '/knowledge/new', label: 'Create article', roles: ['admin', 'responder'] },
  services: { href: '/services/new', label: 'Create service', roles: ['admin'] },
  collections: { href: '/collections/new', label: 'Create collection', roles: ['admin'] },
  groups: { href: '/groups/new', label: 'Create group', roles: ['admin'] },
  members: { href: '/workspace/invite', label: 'Invite teammate', roles: ['admin'] },
  incidents: {
    href: '/incidents/new',
    label: 'Create incident',
    roles: ['admin', 'responder', 'user'],
  },
};

/** Keep selections inside a searchable control; results support keyboard navigation and safe record creation. */
export function ReferenceField({
  label,
  options = [],
  value,
  onChange,
  multiple = false,
  name,
  disabled = false,
  error,
  onSearch,
  referenceType,
  required = false,
}) {
  const id = useId(),
    [search, setSearch] = useState(''),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1),
    [typing, setTyping] = useState(false);
  const input = useRef(null);
  const labels = useRef(new Map());
  const { user } = useContext(AuthContext),
    client = useQueryClient();
  const destination = destinations[referenceType];
  const canCreate = destination?.roles.includes(user?.role);
  const ids = multiple ? value || [] : value ? [value] : [];
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);
  const remote = useResource(
    referenceType && (open || ids.length)
      ? `/references/${referenceType}?${new URLSearchParams({ q: query, page, selected: ids.join(',') })}`
      : null,
  );
  const available = referenceType
    ? [...(remote.data?.selected ?? []), ...(remote.data?.options ?? [])]
    : options;
  for (const selected of ids) {
    const option = [...available, ...options].find((row) => row.id === selected);
    if (option) labels.current.set(selected, option.label);
  }
  for (const key of labels.current.keys()) if (!ids.includes(key)) labels.current.delete(key);
  const selectedLabel = (selected) => labels.current.get(selected) || 'Unavailable record';
  /** Keep navigation separate from selection; IDs are encoded under known application routes. */
  const recordLink = (selected) =>
    recordRoutes[referenceType] && selected ? (
      <a
        href={`${recordRoutes[referenceType]}/${encodeURIComponent(selected)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center justify-center rounded p-1.5 text-blue-700 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300 dark:hover:bg-blue-900"
        title={`Open ${selectedLabel(selected)} in a new tab`}
        aria-label={`Open ${selectedLabel(selected)} in a new tab`}
      >
        <InformationCircleIcon className="h-5 w-5" aria-hidden="true" />
      </a>
    ) : null;
  const matches = (referenceType ? (remote.data?.options ?? []) : options).filter(
    (option) => !ids.includes(option.id),
  );
  const select = (option) => {
    onChange(multiple ? [...ids, option.id] : option.id);
    setSearch('');
    onSearch?.('');
    setTyping(false);
    setActive(-1);
    setOpen(multiple);
    input.current?.focus();
  };
  /** Refresh choices on focus so records created in another tab become available without resetting the form. */
  function showResults() {
    setOpen(true);
    if (referenceType) void remote.refresh();
    if (referenceType && user)
      void client.invalidateQueries({
        predicate: ({ queryKey }) =>
          queryKey[0] === 'private' &&
          queryKey[1] === user.email &&
          (queryKey[2] === `/${referenceType}` || queryKey[2]?.startsWith(`/${referenceType}?`)),
      });
  }
  return (
    <div
      className="space-y-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setTyping(false);
          setSearch('');
          setActive(-1);
          onSearch?.('');
        }
      }}
    >
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {name &&
        ids.map((selected) => <input key={selected} type="hidden" name={name} value={selected} />)}
      <div
        className={`reference-control ${disabled ? 'reference-disabled' : ''}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) input.current?.focus();
        }}
      >
        {multiple &&
          ids.map((selected) => (
            <span
              key={selected}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200"
            >
              <span className="min-w-0 break-words">{selectedLabel(selected)}</span>
              {recordLink(selected)}
              <button
                type="button"
                disabled={disabled}
                className="shrink-0 rounded p-1"
                aria-label={`Remove ${selectedLabel(selected)}`}
                onClick={() => {
                  onChange(ids.filter((item) => item !== selected));
                  input.current?.focus();
                }}
              >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </span>
          ))}
        <input
          ref={input}
          id={id}
          data-reference-name={name}
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-required={required}
          type="text"
          autoComplete="off"
          value={!multiple && !typing && ids.length ? selectedLabel(ids[0]) : search}
          disabled={disabled}
          aria-expanded={open && !disabled}
          aria-controls={open && !disabled ? `${id}-results` : undefined}
          aria-activedescendant={
            open && active >= 0 && matches[active] ? `${id}-option-${active}` : undefined
          }
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder={multiple && ids.length ? 'Search to add more…' : 'Search to select…'}
          onFocus={(event) => {
            showResults();
            if (!multiple) event.target.select();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              setOpen(false);
              setTyping(false);
              setSearch('');
              onSearch?.('');
              setActive(-1);
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              const next =
                event.key === 'ArrowDown'
                  ? Math.min(active + 1, matches.length - 1)
                  : Math.max(active - 1, 0);
              setActive(next);
              document.getElementById(`${id}-option-${next}`)?.scrollIntoView({ block: 'nearest' });
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              if (open && matches[active]) select(matches[active]);
              else if (open && matches.length === 1) select(matches[0]);
            }
          }}
          onChange={(event) => {
            setTyping(true);
            setSearch(event.target.value);
            onSearch?.(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
        />
        {!multiple && ids.length > 0 && recordLink(ids[0])}
        {!multiple && ids.length > 0 && (
          <button
            type="button"
            disabled={disabled}
            className="shrink-0 rounded p-2 text-slate-500"
            aria-label={`Clear ${selectedLabel(ids[0])}`}
            onClick={() => {
              onChange('');
              setSearch('');
              setTyping(false);
              onSearch?.('');
              input.current?.focus();
            }}
          >
            <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {open && !disabled && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700">
          <div
            id={`${id}-results`}
            role="listbox"
            aria-label={label}
            aria-multiselectable={multiple || undefined}
            className="max-h-52 overflow-y-auto p-2"
          >
            {matches.length ? (
              matches.map((option, index) => (
                <button
                  type="button"
                  key={option.id}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={active === index}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  className={`block w-full rounded p-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-800 ${active === index ? 'bg-blue-50 dark:bg-slate-800' : ''}`}
                  onClick={() => select(option)}
                >
                  {option.label}
                  {option.description && (
                    <span className="ml-2 text-xs text-slate-500">{option.description}</span>
                  )}
                </button>
              ))
            ) : (
              <p className="p-2 text-sm text-slate-500">No matching records.</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 p-2 dark:border-slate-700">
            {referenceType && (page > 1 || remote.data?.hasMore) && (
              <div className="flex justify-between gap-2 p-2">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={page === 1 || remote.pending}
                  onClick={() => {
                    setPage(page - 1);
                    setActive(-1);
                  }}
                >
                  Previous results
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={!remote.data?.hasMore || remote.pending}
                  onClick={() => {
                    setPage(page + 1);
                    setActive(-1);
                  }}
                >
                  More results
                </button>
              </div>
            )}
            {remote.error && (
              <p role="alert" className="p-2 text-sm text-rose-700 dark:text-rose-400">
                {remote.error}
              </p>
            )}
            {canCreate && (
              <a
                href={destination.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded p-2 text-sm font-medium text-blue-700 dark:text-blue-300"
              >
                {destination.label}
                <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
            <button
              type="button"
              className="p-2 text-xs text-blue-700 dark:text-blue-300"
              onClick={() => {
                setOpen(false);
                setTyping(false);
                setSearch('');
                onSearch?.('');
              }}
            >
              Close results
            </button>
          </div>
        </div>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
