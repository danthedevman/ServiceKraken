/** Built-in communication and ticketing adapters deliver incident updates. */
export const providers = [
  {
    id: 'email',
    name: 'Email (SMTP)',
    category: 'Communication',
    description:
      'Send incident alerts and customer comment notifications through your SMTP provider.',
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Communication',
    description: 'Post impact and recovery updates to a channel using an incoming webhook.',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    category: 'Communication',
    description: 'Send incident updates to a Teams channel through a Workflow webhook.',
  },
  {
    id: 'servicenow',
    name: 'ServiceNow',
    category: 'Ticketing',
    description:
      'Create correlated incidents and append recovery work notes without duplicate tickets.',
  },
];
