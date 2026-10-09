/** Additional provider fields shared by client validation, configuration forms, and secret storage. */
export const providerFields = {
  discord: [],
  pagerduty: [{ key: 'token', label: 'Events API routing key', max: 1000, secret: true }],
  github: [{ key: 'token', label: 'Repository access token', max: 1000, secret: true }],
  jira: [
    { key: 'username', label: 'Account email', max: 200 },
    { key: 'password', label: 'API token', max: 1000, secret: true },
    { key: 'projectKey', label: 'Project key', max: 80, pattern: '^[A-Z][A-Z0-9_]*$' },
    { key: 'issueTypeId', label: 'Issue type ID', max: 30, pattern: '^[0-9]+$' },
  ],
  webhook: [
    { key: 'token', label: 'Bearer token (optional)', max: 1000, secret: true, optional: true },
  ],
};
