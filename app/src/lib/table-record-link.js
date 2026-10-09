const routes = {
  incidents: '/incidents',
  tasks: '/tasks',
  knowledge: '/knowledge',
  services: '/services',
  collections: '/collections',
  monitors: '/monitors',
  members: '/workspace',
  groups: '/groups',
  integrations: '/integrations',
  coverage: '/on-call',
  'priority-incidents': '/incidents',
  'priority-tasks': '/tasks',
  'impacted-services': '/services',
  'incident-knowledge': '/knowledge',
};

/** Only known record routes are eligible; history and data-only rows have no fabricated destination. */
export function tableRecordLink(source, deletePath, row) {
  const kind = source?.split('?')[0] || deletePath?.slice(1);
  const path = routes[kind];
  return path && row.id ? `${path}/${encodeURIComponent(row.id)}` : null;
}
