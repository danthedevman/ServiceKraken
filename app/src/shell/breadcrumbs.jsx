import React from 'react';
import { dashboardReport } from '../../../shared/domain/dashboard-reports.js';
import { Link, useLocation } from 'react-router-dom';
import { useResource } from '../data/use-resource.js';

const sections = {
  profile: 'Profile',
  dashboard: 'Dashboard',
  help: 'Help',
  settings: 'Settings',
  incidents: 'Incidents',
  tasks: 'Tasks',
  knowledge: 'Knowledge Bases',
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
  const { pathname, search } = useLocation(),
    parts = pathname.split('/').filter(Boolean);
  const [kind, id, action] = parts;
  const directory = ['groups', 'workspace'].includes(kind);
  const nested = !!sections[kind] && id !== 'public';
  const catalog = [
    'services',
    'collections',
    'groups',
    'integrations',
    'workspace',
    'on-call',
  ].includes(kind);
  const path =
    resolveNames &&
    nested &&
    id &&
    !['new', 'fields', 'invite', 'settings', 'articles', 'bases', 'ai'].includes(id)
      ? ['monitors', 'incidents', 'tasks', 'knowledge'].includes(kind)
        ? `/${kind}/${id}`
        : catalog
          ? kind === 'workspace'
            ? '/members'
            : `/${kind}`
          : null
      : null;
  const basePath = kind === 'knowledge' && id === 'bases';
  const { data } = useResource(
    basePath && action && action !== 'new' ? `/knowledge-bases/${action}` : path,
  );
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
  if (directory) crumbs.unshift({ label: 'Settings', to: '/settings' });
  if (kind === 'monitors') crumbs.unshift({ label: 'Services', to: '/services' });
  if (basePath)
    crumbs.push({ label: action === 'new' ? 'Create Knowledge Base' : name || 'Knowledge Base' });
  else if (kind === 'knowledge' && id === 'articles') crumbs.push({ label: 'All Articles' });
  else if (kind === 'dashboard' && id === 'reports') {
    const params = new URLSearchParams(search);
    crumbs.push({
      label:
        dashboardReport(params.get('report'), params.get('value') || '')?.title ||
        'Report Not Found',
    });
  } else if (id === 'new')
    crumbs.push({ label: `Create ${noun.charAt(0).toUpperCase()}${noun.slice(1)}` });
  else if (id === 'fields') crumbs.push({ label: 'Form Builder' });
  else if (id === 'invite') crumbs.push({ label: 'Invite Teammate' });
  else if (kind === 'settings' && id === 'audit') crumbs.push({ label: 'Audit Log' });
  else if (id === 'settings') crumbs.push({ label: 'Settings' });
  else if (kind === 'integrations' && id === 'ai') crumbs.push({ label: 'AI Provider' });
  else if (id) {
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
              <h1
                className="breadcrumb-title block max-w-[min(55vw,28rem)] truncate text-lg font-semibold text-slate-700 dark:text-slate-200"
                title={crumb.label}
                aria-current="page"
              >
                {crumb.label}
              </h1>
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
