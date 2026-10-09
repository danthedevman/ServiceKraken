/** Built-in communication and ticketing adapters deliver incident updates. */
export const providers = [
  {
    id: 'email',
    name: 'Email (SMTP)',
    category: 'Email',
    description:
      'Send incident alerts and customer comment notifications through your SMTP provider.',
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Chat',
    description: 'Post impact and recovery updates to a channel using an incoming webhook.',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    category: 'Chat',
    description: 'Send incident updates to a Teams channel through a Workflow webhook.',
  },
  {
    id: 'servicenow',
    name: 'ServiceNow',
    category: 'Ticketing',
    description:
      'Create correlated incidents and append recovery work notes without duplicate tickets.',
  },
  {
    id: 'discord',
    name: 'Discord',
    category: 'Chat',
    description: 'Post labeled impact and recovery messages to a channel webhook.',
  },
  {
    id: 'pagerduty',
    name: 'PagerDuty',
    category: 'On-call',
    description: 'Trigger and resolve alerts using an Events API routing key.',
  },
  {
    id: 'jira',
    name: 'Jira Cloud',
    category: 'Ticketing',
    description: 'Create issues for incidents and add recovery comments.',
  },
  {
    id: 'github',
    name: 'GitHub Issues',
    category: 'Ticketing',
    description: 'Create repository issues and add recovery comments for your team.',
  },
  {
    id: 'webhook',
    name: 'Generic Webhook',
    category: 'Webhooks',
    description: 'Send labeled JSON updates to a public HTTPS endpoint.',
  },
];

/** SMTP presets reuse email delivery, including comments and status subscriptions. */
export const emailPresets = [
  {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'Email',
    description: 'Deliver email through SendGrid SMTP with a verified sender and API key.',
    smtpHost: 'smtp.sendgrid.net',
    smtpUser: 'apikey',
  },
  {
    id: 'ses',
    name: 'Amazon SES',
    category: 'Email',
    description: 'Deliver email through your regional Amazon SES SMTP endpoint.',
    smtpHost: 'email-smtp.us-east-1.amazonaws.com',
    smtpUser: '',
  },
];
