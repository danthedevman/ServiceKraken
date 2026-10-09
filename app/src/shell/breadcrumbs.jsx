import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useResource } from '../data/use-resource.js';

const sections = {
  settings: 'Settings',
  incidents: 'Incidents',
  tasks: 'Tasks',
  knowledge: 'Knowledge',
  services: 'Services',
  collections: 'Collections',
  monitors: 'Monitors',
  groups: 'Groups',
  integrations: 'Integrations',
  workspace: 'Users',
  'on-call': 'On Call',
  status: 'Status Page',
};
/** Keep every routed form connected to its parent list and, when available, its saved record. */
export function Breadcrumbs({ resolveNames = true }) {
  const { pathname } = useLocation(),
    parts = pathname.split('/').filter(Boolean);
  const [kind, id, action] = parts;
  const nested = !!sections[kind] && !!id && id !== 'public';
  const catalog = [
    'services',
    'collections',
    'groups',
    'integrations',
    'workspace',
    'on-call',
  ].includes(kind);
  const path =
    resolveNames && nested && !['new', 'fields', 'invite', 'settings'].includes(id)
      ? ['monitors', 'incidents', 'tasks', 'knowledge'].includes(kind)
        ? `/${kind}/${id}`
        : catalog
          ? kind === 'workspace'
            ? '/members'
            : `/${kind}`
          : null
      : null;
  const { data } = useResource(path);
  if (!nested) return null;
  const name =
    data?.monitor?.name ||
    data?.incident?.title ||
    data?.item?.title ||
    data?.[kind]?.find((item) => item.id === id)?.name ||
    data?.members?.find((item) => item.id === id)?.displayName ||
    (kind === 'on-call' && data?.shifts?.find((item) => item.id === id)?.start);
  const nouns = {
    incidents: 'incident',
    tasks: 'task',
    knowledge: 'article',
    services: 'service',
    collections: 'collection',
    monitors: 'monitor',
    groups: 'group',
    integrations: 'integration',
    workspace: 'user',
    'on-call': 'coverage',
  };
  const noun = nouns[kind] || 'record',
    crumbs = [{ label: sections[kind], to: `/${kind}` }];
  if (kind === 'monitors') crumbs.unshift({ label: 'Services', to: '/services' });
  if (id === 'new')
    crumbs.push({ label: `Create ${noun.charAt(0).toUpperCase()}${noun.slice(1)}` });
  else if (id === 'fields') crumbs.push({ label: 'Form Builder' });
  else if (id === 'invite') crumbs.push({ label: 'Invite Teammate' });
  else if (kind === 'settings' && id === 'audit') crumbs.push({ label: 'Audit Log' });
  else if (id === 'settings') crumbs.push({ label: 'Settings' });
  else {
    crumbs.push({
      label: name || `${noun.charAt(0).toUpperCase()}${noun.slice(1)}`,
      to: `/${kind}/${id}`,
    });
    if (action === 'password') crumbs.push({ label: 'Reset Password' });
    if (action === 'edit') crumbs.push({ label: 'Edit' });
    if (action === 'events') crumbs.push({ label: 'Check Event' });
  }
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
        {crumbs.map((crumb, index) => (
          <li key={index} className="flex min-w-0 items-center gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {index === crumbs.length - 1 ? (
              <span
                className="block max-w-[min(55vw,28rem)] truncate text-slate-700 dark:text-slate-200"
                title={crumb.label}
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                title={crumb.label}
                className="block max-w-[min(55vw,28rem)] truncate hover:text-blue-700 dark:hover:text-blue-400"
                to={crumb.to}
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
