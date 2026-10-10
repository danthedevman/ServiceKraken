/** Product documentation stays local, versioned with the application, and contains no workspace data. */
export const helpTopics = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    screenshots: [
      {
        src: '/help/getting-started.png',
        alt: 'Create Service form with a demo name and description, health thresholds, and the start of ownership settings',
        caption:
          'Demo workspace: Create a service with a clear name and description, then choose its owners and dependencies.',
      },
      {
        src: '/help/record-references.png',
        alt: 'Read-only demo task with links to its service, assignment group, and assignee',
        caption:
          'Demo workspace: Reference labels remain clickable in read-only records and open the related record in a new tab.',
      },
    ],
    paragraphs: [
      'Start by creating a service for something your team owns, such as a customer portal or payments API. Add owners and a primary contact, then create a monitor from the service’s action menu.',
      'Create user profiles, assign appropriate roles, and configure a communication integration before relying on notifications. Add an on-call schedule so responders know who owns coverage.',
      'Use the global Create button for new records, including Knowledge Articles. Admins also have a Create User option. Open a saved record and select Edit to change it. Save applies changes; Cancel leaves edit mode without saving your draft. Related information appears in tabs below the record.',
      'Populated reference fields remain links when viewing a read-only record. Select the reference label or its info link to open the related record in a new tab. Your existing access permissions still apply.',
    ],
  },
  {
    id: 'services',
    title: 'Services, Collections, and Dependencies',
    screenshots: [
      {
        src: '/help/services.png',
        alt: 'Services list showing the demo Customer Portal and Payments API with their health and ownership columns',
        caption:
          'Demo workspace: Open a service by its name to review ownership, dependencies, and related records.',
      },
    ],
    paragraphs: [
      'A service represents a capability your team supports. Collections organize related services. You can select or create a collection from the service form, and associate users or groups as owners.',
      'Dependencies describe services that another service relies on. A failing dependency can affect the parent service’s health. Avoid circular dependencies.',
      'Service health comes from recent monitor results and dependencies. A failing check makes the service down; missing, paused, or stale checks can make it unknown. Creating a monitor alone does not establish healthy status—wait for a successful check.',
    ],
  },
  {
    id: 'monitoring',
    title: 'Monitoring Endpoints',
    screenshots: [
      {
        src: '/help/monitoring.png',
        alt: 'Monitors list with demo HTTP endpoints, health states, associated services, and check intervals',
      },
    ],
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
    screenshots: [
      {
        src: '/help/tasks-board.png',
        alt: 'Demo Tasks Kanban board with a custom Demo Review lane, admin lane ordering controls, and per-card Move To controls',
        caption:
          'Demo workspace: Drag a task into another lane, or use Move To to save its status. Archived Tasks opens a separate list.',
      },
      {
        src: '/help/knowledge-bases.png',
        alt: 'Demo knowledge base cards with a simple search field and Create Knowledge Base control',
        caption:
          'Demo workspace: Search by base name or description, then open a card to view its articles.',
      },
      {
        src: '/help/knowledge-article.png',
        alt: 'Demo article creation form associated with Demo Recovery Guides knowledge base',
        caption:
          'Demo workspace: The optional Knowledge Base reference organizes articles; leave it empty for an unassigned article.',
      },
      {
        src: '/help/knowledge-runbook.png',
        alt: 'Demo runbook reading page with numbered recovery steps',
        caption:
          'Demo workspace: Runbooks display saved instructions as a readable process document.',
      },
      {
        src: '/help/knowledge-base-delete.png',
        alt: 'Demo knowledge base deletion dialog with content action and Cancel control',
        caption:
          'Demo workspace: Choose whether to move articles to another base or permanently delete them and their attachments.',
      },
    ],
    paragraphs: [
      'Global search results open the matching record page where available. Admins can open a user’s record directly from search; service, collection, and group results also link to their detail pages.',
      'Use the Search Tasks or Search Knowledge Bases placeholder to find records; both search controls remain labeled for assistive technology.',
      'Knowledge opens cards for knowledge bases. Create a base to organize articles, or use All Articles or global Create to create an article or runbook without a base. The Knowledge Base reference is optional. Admins can delete a base from its record action menu and choose to move its articles to another base or delete the articles and their attachments. Choose an existing destination or create a new base from the destination reference. Confirm the selected consequence before deleting.',
      'Knowledge records default to Article. Choose Runbook for a step-by-step process, add titled steps with instructions, and reorder them with Move Up or Move Down. An introduction is optional for a runbook. Saved articles display as reading pages; runbooks display numbered steps.',
      'Create an incident with a clear title, affected service, severity, and description. Assign the responder and, when appropriate, the person the incident was opened for. Use tasks to track investigation and follow-up work.',
      'Tasks opens as a Kanban board with a lane for every active status, including custom statuses. Only admins can reorder lanes by dragging their headers or using their left/right controls. Lane order is saved globally for the workspace and applies to everyone. Admins and responders can drag a task between lanes to save its status immediately, or use the card’s Move To control with a keyboard or touch screen. Drag above or below another card to save its position within the lane; Move Up and Move Down provide the keyboard and touch alternative. Ordering is shared with the workspace and survives reloads. Viewers can open cards but cannot move them. A failed save keeps the saved status and shows an error; a concurrent edit refreshes the record before retrying.',
      'Lanes fill the available page height and grow with their cards. Cards continue down each lane and load automatically as you scroll. While dragging, the source fades, eligible lanes have dashed outlines, and blue insertion bars and drop hints show the proposed position. Use Refresh to reload a lane. List View shows active tasks as a table. Archived tasks never appear on the board: open Archived Tasks for their separate list. Archive or restore a task from its record’s Edit form.',
      'Comments are shared with people who can read the incident and can notify its participants through configured email delivery. Work notes are visible only to responders and admins. Do not put internal information in a shared comment.',
      'Use Resolve when the incident is no longer active. Resolution notes are required only when configured as mandatory. Reopen asks for confirmation, with Cancel focused initially; saving an active status from a resolved incident’s Edit form also requires confirmation. Monitor-created incidents also have automatic lifecycle behavior; read the record’s notice before resolving an ongoing outage manually.',
      'Open Knowledge to view knowledge-base cards. Use Search Knowledge Bases to find a base by name or description, then select its card to open its articles. Admins and responders first choose Create (+), enter the base name and description, then open it and choose Create to add an associated article. The article’s Knowledge Base reference can be changed to another base in the workspace. Viewers can read bases and articles. All Articles includes older unassigned articles, which can be assigned a base when edited. Link relevant articles to incidents and services. Images embedded in article content stay separate from the visible attachment list.',
      'Choose attachments or drag files into the upload box. Files must use a supported extension and be no larger than 5 MB, with up to 20 attachments per record including embedded images. Uploads on a new form are staged privately. Create sends their file IDs so the API can link them to the new record. Cancel abandons the draft and aborts an active upload; completed unattached files become eligible for worker cleanup after 24 hours.',
    ],
  },
  {
    id: 'people',
    title: 'People, Access, and On-call Coverage',
    screenshots: [
      {
        src: '/help/profile-themes.png',
        alt: 'Demo profile with ten color scheme cards and accessibility controls',
        caption:
          'Demo workspace: Select a color scheme, then adjust contrast, motion, and text size.',
      },
      {
        src: '/help/profile-date-ai.png',
        alt: 'Demo profile with date and time format selectors and enabled AI feature switches',
        caption:
          'Demo workspace: Choose timestamp formats and control the AI features available through the workspace provider.',
      },
    ],
    paragraphs: [
      'Admins manage configuration and membership. Responders manage operational work such as incidents, tasks, and knowledge. Users can create incidents and view incidents opened by or for them. Viewers can read permitted workspace information but cannot edit it.',
      'An admin creates a profile from Users with a name, email, role, and initial password. Share the password privately. Admins can reset another user’s password from their record after confirming their own password; this signs the user out. The owner changes their own password in Profile settings. Groups let you organize multiple members for ownership and coordination.',
      'Create coverage from On-call or select a calendar date to prefill it. Choose the teammate, service scope, and UTC start/end times. Rotation settings create multiple shifts. Confirm before removing a shift.',
      'Set your name, phone, and time zone in Profile settings. Personal timestamps use your saved time zone, including daylight-saving changes. Schedules, date filters, audit timestamps, and status-history day buckets that are labeled UTC remain UTC. Adding a phone number does not enable SMS or voice delivery.',
      'Profile settings includes ten Theme color schemes, light or dark appearance, higher contrast, reduced motion, and text size. Date and Time settings offers browser defaults, 12-hour or 24-hour clocks, and alternative date formats. These account preferences apply across the app; explicitly UTC schedules, filters, and exports retain their documented formats.',
    ],
  },
  {
    id: 'integrations',
    title: 'Configure Integrations and Notifications',
    screenshots: [
      {
        src: '/help/ai-provider.png',
        alt: 'Demo AI provider settings with a model identifier, empty API key field, and connection controls',
        caption:
          'Demo workspace: Admins configure a provider and model. Saved keys are never displayed.',
      },
      {
        src: '/help/ai-drafting.png',
        alt: 'Demo AI article draft with a reviewable preview and Use Draft in Form control',
        caption:
          'Demo workspace: Generate and review a draft, confirm replacement of the form content, then save the record yourself.',
      },
      {
        src: '/help/ai-knowledge.png',
        alt: 'Demo knowledge answer with a numbered source link to a knowledge article',
        caption:
          'Demo workspace: Ask a question and open the cited source articles to verify the answer.',
      },
    ],
    paragraphs: [
      'Admins open Integrations → AI Provider, select OpenAI or Claude, enter an API model identifier and provider API key, and Save Provider. Use Test Connection after saving to check credentials and model access. One provider is configured per workspace; removing it requires confirmation and hides all AI features. Provider charges and account quotas apply.',
      'With a provider configured, summaries, article/runbook drafting, and knowledge answers are enabled by default. Each workspace user with operational access can disable individual features under Profile → AI Features; disabled features are hidden and the API rejects their requests. Incident-portal users do not have AI access. Viewers can use summaries and knowledge answers; drafting requires responder or admin access.',
      'Select Summarize on a saved task or incident. In an article or runbook form, describe the desired document and choose Generate Draft. Review the preview, then confirm Use Draft in Form to replace title, summary, content, and steps. This creates an unsaved draft; normal validation and Save/Create still apply. AI never automatically changes a record.',
      'Ask Knowledge searches up to five matching published articles in the workspace or current base and returns an answer with source links. Draft and archived articles are excluded. Matching uses keywords, so try other wording if relevant articles are missed. Answers can be incorrect or incomplete; verify them against the linked sources.',
      'Requests send selected record text, your prompt, or matching published article excerpts to the configured provider. Attachments, credentials, and internal work-note conversations are not included. Keys are encrypted on the server and are never returned to the browser. Generation is limited to 10 requests per user per minute and 1,000 requests per workspace per UTC day, including failed provider calls. Prompts and generated output are not saved by this app unless you save a draft as record content.',
      'Admins can configure SMTP email (including SendGrid and Amazon SES presets), Slack, Microsoft Teams, Discord, PagerDuty, ServiceNow, Jira Cloud, GitHub Issues, and generic HTTPS webhooks under Integrations. Browse the catalog by category. Choose the provider, enter its configuration, enable delivery, and select service scopes, recovery notifications, and on-call routing where applicable.',
      'Email requires an authorized sender and a configured SMTP server. Supported SMTP ports are 465 for implicit TLS and 587 for STARTTLS. Use the credentials and sender verification required by your provider. An email address in a user profile alone is not enough to send mail.',
      'Slack and Teams require an appropriate provider webhook. ServiceNow requires your instance and a dedicated account with permission to create incidents. Keep credentials out of incident descriptions, comments, and screenshots.',
      'Review Integrations → Logs when messages do not arrive. Check whether the integration is enabled, its service scope matches, and the SMTP/webhook credentials are valid. Workers and Redis must be running to process queued delivery.',
    ],
  },
  {
    id: 'status-page',
    title: 'Status Pages and Subscriptions',
    screenshots: [
      {
        src: '/help/status-background.png',
        alt: 'Demo service status page with a custom soft green background and readable health panels',
        caption:
          'Demo workspace: The selected status background applies around the service health content. Use the swatch or enter a six-digit hex colour; the preview shows contrast, and Use App Theme restores the default.',
      },
      {
        src: '/help/status-settings.png',
        alt: 'Demo status settings with a compact background swatch, hex value, preview, and Use App Theme control',
        caption:
          'Demo workspace: Choose a colour with the swatch or hex field, review its preview, then Save Status Page. Use App Theme restores the default.',
      },
    ],
    paragraphs: [
      'Open Service Status and select the settings gear. Choose Private for workspace access or Public to share the generated public link. The public page has no application sidebar and omits monitor targets and response bodies.',
      'Admins can choose a Background Color in status settings for the private and public status page. Use App Theme removes the override. Content panels retain readable surfaces and heading text adjusts to the chosen background.',
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
    screenshots: [
      {
        src: '/help/configuration.png',
        alt: 'Demo Task Form Builder with the System Field status label changed to Demo Workflow and an additional Demo Review option',
        caption:
          'Demo workspace: Select Edit, choose a System Field, update its label or add select options, then Save the form configuration.',
      },
      {
        src: '/help/dashboard-overview.png',
        alt: 'Demo Overview dashboard with a view dropdown and cross-domain scorecards and report links',
        caption:
          'Demo workspace: Use Dashboard View to choose Overview or a domain dashboard. Bar and pie charts show incident severity, task status, service health, and knowledge article status; use their links to inspect records.',
      },
    ],
    paragraphs: [
      'Breadcrumbs provide the page title across forms and lists. Record IDs and status appear in the form body, while the header contains record actions aligned with the information-panel toggle. Secondary controls precede the primary action in both visual and keyboard order. Fields use subtle theme-aware borders to distinguish controls from their background. Reference fields and dropdowns have a single outline; their option lists can open beyond header and scroll-container boundaries.',
      'Admins access Form Builder from a supported record or create form. Select Edit to change configuration. System Fields can be reordered and their labels updated; select System Fields also accept additional options and updated option labels. Required flags, field types, and visibility remain fixed. Cancel discards the draft; Save applies it.',
      'Select any System Field or custom field and enter Help Text to explain its purpose or expected value. Help text is plain text, limited to 1,000 characters, and displays beside the corresponding form control with an accessible association. Save the form configuration to make it available to users.',
      'Dashboard opens Overview with bar and pie charts, important counts, and report links across work, services, knowledge, and coverage. Use the Dashboard View picker on the left to switch to Incidents, Tasks, or Service Health, and the refresh icon on the right to update the data. Your selection is saved with your account preferences. Lists and forms align breadcrumbs and compact main action buttons in one header row; new and existing record forms keep their actions visible above the scrolling content, with headers spanning the available width and starting flush with the side menu, without outer top or side gaps; report breadcrumbs show the selected report name.',
      'When adding a System Field select option, choose its canonical workflow meaning. Existing option values, workflow meanings, and visibility stay fixed so saved records and reports remain consistent. Custom-field select options can be added, ordered, hidden, or removed. Existing saved configuration is preserved, and saved custom field types cannot change.',
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
