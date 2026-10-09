/** Product documentation stays local, versioned with the application, and contains no workspace data. */
export const helpTopics = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    paragraphs: [
      'Start by creating a service for something your team owns, such as a customer portal or payments API. Add owners and a primary contact, then create a monitor from the service’s action menu.',
      'Create user profiles, assign appropriate roles, and configure a communication integration before relying on notifications. Add an on-call schedule so responders know who owns coverage.',
      'Use the global Create button for new records. Open a saved record and select Edit to change it. Save applies changes; Cancel leaves edit mode without saving your draft. Related information appears in tabs below the record.',
    ],
  },
  {
    id: 'services',
    title: 'Services, Collections, and Dependencies',
    paragraphs: [
      'A service represents a capability your team supports. Collections organize related services. You can select or create a collection from the service form, and associate users or groups as owners.',
      'Dependencies describe services that another service relies on. A failing dependency can affect the parent service’s health. Avoid circular dependencies.',
      'Service health comes from recent monitor results and dependencies. A failing check makes the service down; missing, paused, or stale checks can make it unknown. Creating a monitor alone does not establish healthy status—wait for a successful check.',
    ],
  },
  {
    id: 'monitoring',
    title: 'Monitoring Endpoints',
    paragraphs: [
      'Create a monitor from a service’s secondary action menu or its Monitors related list. A service and a public HTTP or HTTPS endpoint are required. Check intervals range from 1 minute to 1,440 minutes.',
      'HEAD checks response headers without requesting a full response body. GET also stores a bounded text preview. Choose GET if the endpoint does not support HEAD or you need response details for troubleshooting.',
      'Redirect following is off by default. Enable it when checking an HTTP-to-HTTPS upgrade, canonical hostname, or moved endpoint. Each redirect destination must pass network validation; enabling redirects does not allow private network checks.',
      'Open a monitor to review check events, filter the table, and open an event for response and timing details. A configured interval is a scheduling target: worker backlog, slow endpoints, and infrastructure interruptions can delay execution.',
      'Only HTTP/HTTPS checks are supported. Database connection checks and arbitrary TCP/network scanning are not supported.',
    ],
  },
  {
    id: 'incidents',
    title: 'Incidents, Tasks, and Knowledge',
    paragraphs: [
      'Create an incident with a clear title, affected service, severity, and description. Assign the responder and, when appropriate, the person the incident was opened for. Use tasks to track investigation and follow-up work.',
      'Comments are shared with people who can read the incident and can notify its participants through configured email delivery. Work notes are visible only to responders and admins. Do not put internal information in a shared comment.',
      'Use Resolve when the incident is no longer active. Resolution notes are required only when configured as mandatory. Resolved incidents can be reopened. Monitor-created incidents also have automatic lifecycle behavior; read the record’s notice before resolving an ongoing outage manually.',
      'Knowledge articles capture troubleshooting procedures and findings. Link relevant articles to incidents and services. Images embedded in article content stay separate from the visible attachment list.',
      'Choose attachments or drag files into the upload box. Files must use a supported extension and be no larger than 5 MB, with up to 20 attachments per record including embedded images. Attachments selected while editing are linked when the record is saved.',
    ],
  },
  {
    id: 'people',
    title: 'People, Access, and On-call Coverage',
    paragraphs: [
      'Admins manage configuration and membership. Responders manage operational work such as incidents, tasks, and knowledge. Users can create incidents and view incidents opened by or for them. Viewers can read permitted workspace information but cannot edit it.',
      'An admin creates a profile from Users with a name, email, role, and initial password. Share the password privately. Admins can reset another user’s password from their record after confirming their own password; this signs the user out. The owner changes their own password in Profile settings. Groups let you organize multiple members for ownership and coordination.',
      'Create coverage from On-call or select a calendar date to prefill it. Choose the teammate, service scope, and UTC start/end times. Rotation settings create multiple shifts. Confirm before removing a shift.',
      'Set your name, phone, and time zone in Profile settings. Personal timestamps use your saved time zone, including daylight-saving changes. Schedules, date filters, audit timestamps, and status-history day buckets that are labeled UTC remain UTC. Adding a phone number does not enable SMS or voice delivery.',
    ],
  },
  {
    id: 'integrations',
    title: 'Configure Integrations and Notifications',
    paragraphs: [
      'Admins can configure SMTP email (including SendGrid and Amazon SES presets), Slack, Microsoft Teams, Discord, PagerDuty, ServiceNow, Jira Cloud, GitHub Issues, and generic HTTPS webhooks under Integrations. Browse the catalog by category. Choose the provider, enter its configuration, enable delivery, and select service scopes, recovery notifications, and on-call routing where applicable.',
      'Email requires an authorized sender and a configured SMTP server. Supported SMTP ports are 465 for implicit TLS and 587 for STARTTLS. Use the credentials and sender verification required by your provider. An email address in a user profile alone is not enough to send mail.',
      'Slack and Teams require an appropriate provider webhook. ServiceNow requires your instance and a dedicated account with permission to create incidents. Keep credentials out of incident descriptions, comments, and screenshots.',
      'Review Integrations → Logs when messages do not arrive. Check whether the integration is enabled, its service scope matches, and the SMTP/webhook credentials are valid. Workers and Redis must be running to process queued delivery.',
    ],
  },
  {
    id: 'status-page',
    title: 'Status Pages and Subscriptions',
    paragraphs: [
      'Open Service Status and select the settings gear. Choose Private for workspace access or Public to share the generated public link. The public page has no application sidebar and omits monitor targets and response bodies.',
      'Publish a global banner or service-specific message to explain impact. Choose its criticality and enable it when ready. Messages add context; they do not override measured service health. You can upload or remove a branding icon.',
      'Show or hide subscriptions with one control. Hiding subscriptions stops new signups, email updates, and RSS access. Email and RSS can be configured independently when shown. Unsubscribe links continue to work.',
      'For email subscriptions, select an enabled SMTP integration and configure the public HTTPS origin used for links. Visitors select Subscribe to updates beside the theme toggle, then choose email or RSS. Email requires confirmation within 24 hours and includes an unsubscribe link.',
      'Subscribers receive public service-health and published-message changes, not internal work notes or every unchanged check. RSS provides up to 50 updates from the last 30 days. Workers must run for updates to be published. Switching to Private cannot recall already delivered messages or cached feeds.',
      'To use a custom domain, configure DNS, HTTPS, and a reverse proxy, then set the public origin in status settings. The repository README includes a proxy example; DNS alone cannot map a hostname to the public page’s URL path.',
    ],
  },
  {
    id: 'configuration',
    title: 'Forms, Tables, and Administration',
    paragraphs: [
      'Admins access Form Builder from a supported record or create form. Custom fields allow label, order, and required-setting changes. System Fields can also be reordered, but their other settings are locked. Existing saved configuration is preserved. Field types cannot change after creation.',
      'Custom select options can be added, ordered, hidden, or removed. System Field choices are read-only so workflow meanings and existing reports stay consistent.',
      'Use the filter icon to reveal table search and filters. Search all columns or choose a column, and sort using column headers. Tables search and paginate on the server. CSV export follows filters; selecting rows exposes actions for that selection above the table.',
      'Settings includes the audit log for record activity. Deletion requires confirmation. Review the affected record and consequences before confirming, especially bulk deletion or demo cleanup.',
      'Some infrastructure controls still require deployment configuration, including database connections, network access, and worker capacity. Consult the README for environment variables and monitor limits; not every infrastructure setting has a UI control.',
    ],
  },
  {
    id: 'hosting',
    title: 'Self-hosting and Maintenance',
    paragraphs: [
      'Follow the repository README to create your environment configuration, then run docker compose up -d --build from the project root. The app normally opens at http://127.0.0.1:8090. Use the exact configured origin to avoid write-origin errors.',
      'The application uses a React frontend, Express API, scheduled workers, Redis, and a configured persistence backend. MongoDB and PostgreSQL are supported. Changing a database connection is not a migration of existing data.',
      'Use docker compose ps to check service health and docker compose logs --tail=100 api workers scheduler to investigate startup or scheduling problems. Do not share logs containing credentials or private record data.',
      'Back up your database and integration encryption-key storage before upgrades. Rebuild changed services with docker compose up -d --build. Do not remove persistent volumes unless you intend to erase their data.',
      'For external access, use HTTPS, restrict infrastructure ports, and configure the public application origin. Size workers for check frequency and endpoint latency, and watch queue delays and database growth. More monitors at shorter intervals produce more events.',
    ],
  },
];

export const helpQuestions = [
  [
    'Why is a service Unknown?',
    'Check that its monitors are running, assigned to the correct service, and have recent results. Paused checks, missing results, stale checks, or unknown dependencies can keep the service unknown.',
  ],
  [
    'Why are checks later than the interval?',
    'The interval is a target rather than a guarantee. Inspect event timing, worker health, queue backlog, endpoint latency, and Redis/database connectivity.',
  ],
  [
    'Why is a field or action unavailable?',
    'Your effective role may not allow it, the record may be read-only, or required configuration may be missing. Admins using role preview should return to their admin role before changing configuration.',
  ],
  [
    'Why do I see an origin error when saving?',
    'Open the app at its configured origin. Check APP_ORIGIN for the private app and Public origin in status settings for public subscription links. Restart the API after deployment environment changes.',
  ],
  [
    'Why have I not received a subscription email?',
    'Check spam, confirm that email subscriptions and their SMTP integration are enabled, and verify worker health. Repeated signup requests do not repeatedly send confirmation emails during the 24-hour confirmation period.',
  ],
  [
    'Does a crashed frontend stop checks?',
    'Checks run in workers, independently of the browser. If worker, Redis, or database infrastructure stops, checks can be delayed until it recovers. Keep persistence and backups configured.',
  ],
];
