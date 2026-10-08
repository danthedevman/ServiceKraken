# ServiceKraken

**Know the impact · Own the response**

ServiceKraken is a free, open source application for service monitoring and incident response. It brings services, health checks, incidents, tasks, knowledge, and on-call coverage into one place that developers and small teams can run themselves.

> **Status: Alpha** — ServiceKraken is under active development and intended for evaluation, development environments, and small-team pilots. Expect changing features and occasional bugs. Back up your data before upgrading, and do not rely on it as your only system for critical monitoring or incident response.

## Why I built this

After years of working with enterprise platforms, I wanted to take the parts that help teams do their work and make them available in a smaller, more approachable tool. Knowing what a service depends on, who owns it, what is broken, and what happened last time should be within reach of a team without a large platform budget.

I built ServiceKraken to bring that experience together in something useful that I could share for free. My goal is to give developers and small teams a place to manage their services and respond to problems without requiring a dedicated platform team just to get started. You can host it yourself, inspect the code, and adapt it to the way you work.

### Built with help from ChatGPT

ChatGPT, including Codex, has been a substantial part of building this application. I used it to turn requirements into working features, discuss architecture, write and refactor code, troubleshoot problems, create tests, and develop documentation. This is an AI-assisted project, and I want to be open about that.

The motivation, product direction, and workflow decisions come from my experience with enterprise platforms. ChatGPT helped me move from those ideas to an implementation much faster. That help does not make the code automatically correct or secure: review, testing, and feedback still matter. This repository includes automated checks, and I welcome clear bug reports and improvements.

ChatGPT was used during development. Running ServiceKraken does not require a ChatGPT subscription or an OpenAI API key.

## What you can do

| Area                | Capabilities                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Services            | Define ownership, primary contacts, dependencies, and collections; view related incidents, knowledge, and checks.                                               |
| Monitoring          | Check HTTP/HTTPS endpoints with HEAD or GET, choose intervals from 1 minute to 24 hours, inspect response events, and follow redirects when explicitly enabled. |
| Incident response   | Track severity and state, assign work, link knowledge, add public-facing comments or internal work notes, and resolve or reopen incidents.                      |
| Tasks and knowledge | Organize follow-up work, write rich-text articles, embed images, and attach files to records.                                                                   |
| On-call and people  | Manage teammates, groups, contact details, roles, and scheduled coverage.                                                                                       |
| Status pages        | Share service health privately or through a public page, with history, branding, and global or service-specific announcements.                                  |
| Reporting           | Use incident and task dashboards, server-side table search and filtering, CSV exports, and an admin audit log.                                                  |
| Customization       | Configure form fields and choices, required fields, themes, and saved navigation preferences.                                                                   |

Admins manage configuration and membership. Responders work on incidents, tasks, and articles. Viewers have read-only workspace access. Users can create incidents and see incidents opened by or for them.

## Start with Docker

Clone the repository and enter its directory:

```sh
git clone https://github.com/danthedevman/ServiceKraken.git
cd ServiceKraken
cp .env.example .env
docker compose up -d --build
```

Docker with Compose is required. Open **<http://127.0.0.1:8090>** and create an account. The API health endpoint is <http://127.0.0.1:8090/api/health>.

The default setup runs the frontend, Express API, check workers, scheduler, MongoDB, and Redis as separate containers. Data and the integration-encryption key are kept in persistent volumes.

For an existing installation, keep your current `.env` and volume settings. Do not copy the example over working credentials or database settings.

```sh
# Inspect running services and recent logs
docker compose ps
docker compose logs --tail=100 api workers scheduler

# Rebuild and apply application changes
docker compose up -d --build app api workers scheduler

# Stop the stack while keeping its data
docker compose down
```

**Do not use `docker compose down -v` unless you intend to delete stored data.** A production frontend is compiled into its image, so source changes need a rebuild. Use development mode below for hot reload.

### A useful first setup

1. Create a service for an application or API your team owns.
2. Add a monitor to its health endpoint. Use HEAD if the endpoint supports it and you only need its HTTP status; use GET when response content is useful for investigation.
3. Invite teammates, assign service owners, and add dependencies where a failure can affect another service.
4. Connect one notification channel and confirm delivery before relying on it.
5. Add a short runbook and an on-call schedule so an alert has an owner and a next step.

To explore first, use **Settings → Add demo data**. It creates 50 sample records per supported type, with realistic scenarios. Sample users cannot sign in, sample monitors remain paused, and sample integrations do not send notifications. Only one demo batch can exist at a time. Deleting demo data uses internal batch markers rather than names and leaves unrelated records intact.

## Choose your database

MongoDB is the default application database. PostgreSQL is also supported through the shared persistence layer. Redis is required for background jobs with either database.

- Use `compose.postgres.yaml` with `DATABASE_PROVIDER=postgres` and `DATABASE_URL` for bundled PostgreSQL.
- Use `compose.external-db.yaml` for an existing MongoDB or PostgreSQL server.
- Changing the provider does not migrate existing data. MySQL and other SQL engines are not currently supported.

See [database setup, TLS, backups, and compatibility](docs/database-backends.md) for the complete commands. Attachments and status-page icons are stored in the configured database, so include them in storage planning and backups.

## Connect tools without adding unnecessary cost

My recommendation is to start with the communication tools your team already uses. Connect a useful destination first, then add another integration when there is a clear need. ServiceKraken has no software subscription fee, but hosting, email delivery, domains, backups, and third-party accounts may cost money.

| Connection      | What to configure in Integrations                                                                                                                       | When I would use it                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email / SMTP    | A public SMTP hostname, port 465 or 587, sender, credentials, and fallback recipients. Enable comment notifications on one email integration if needed. | A straightforward starting point for a small team. Reuse an approved SMTP provider rather than running a mail server just for alerts.               |
| Slack           | An official incoming webhook URL for your chosen channel.                                                                                               | When the team already coordinates in Slack. A dedicated incident channel can keep response updates out of general conversation.                     |
| Microsoft Teams | A supported Workflow webhook that accepts requests from ServiceKraken and posts to a channel.                                                           | When the team already uses Microsoft 365. Give the workflow a co-owner so it does not depend on one person's account.                               |
| ServiceNow      | Your instance root URL and a dedicated integration account with appropriate incident permissions.                                                       | When an existing organization needs incidents in ServiceNow as well. I would not buy an enterprise platform solely to receive ServiceKraken alerts. |

For **SendGrid**, use `smtp.sendgrid.net`, port `587`, the literal username `apikey`, and a SendGrid API key as the password. Set up your sender identity and sending permissions with the provider. See [SendGrid's SMTP instructions](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api).

If you already operate in AWS, **Amazon SES** is worth comparing for usage-based email delivery. It connects through the generic SMTP integration using a regional endpoint and SES SMTP credentials, which are different from AWS access keys. Check [SES setup requirements](https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html) and [current pricing](https://aws.amazon.com/ses/pricing/) against your expected volume before choosing it.

For channel setup, follow the official [Slack incoming webhook guide](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/) or [Teams workflow guidance](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook). Provider plans, quotas, and tenant permissions can change; a supported integration does not mean the provider is free or automatically enabled for your account.

Messages use labeled fields, including **Description**, across email, Slack, Teams, and ServiceNow. ServiceNow uses a correlation ID to find an existing incident and adds recovery work notes; it does not automatically close the external incident. Email can notify end users about incident comments. Internal work notes are not included in those notifications.

Integration credentials are encrypted with a persistent key generated for the API and workers. Blank secret inputs retain existing credentials. Back up that key with the database. Review **Recent deliveries** for failures: a queued job is not proof that a provider accepted a message. Retries can occasionally deliver a duplicate if a process stops after provider acceptance.

### Keep the running costs predictable

- Start with one always-on host and the bundled database and Redis when that suits your availability needs. A sleeping application or worker cannot provide continuous monitoring.
- Use a longer interval for lower-priority services. Five-minute checks produce one fifth as many events as one-minute checks.
- Prefer a small health endpoint. HEAD avoids response-body capture when supported; GET provides more diagnostic detail but can use more bandwidth and storage.
- Add only the notification destinations someone will act on. Multiple providers introduce more accounts, credentials, and delivery failures to maintain.
- Budget for persistent storage and tested backups before increasing the number of checks. Managed services can reduce maintenance work, but compare their total cost with the time you spend operating them.

## Scaling the application

There is no single monitor count that every host can handle. The number of monitors, check intervals, endpoint response times, response sizes, database performance, and other workspace activity all matter. The examples here are planning estimates, not published load-test results or a capacity guarantee.

### Estimate the workload

```text
Checks per second = active monitors / interval in seconds
Approximate busy check slots = checks per second × average check duration in seconds
```

For example, 500 monitors checked every minute generate about **8.3 checks per second**, **720,000 events per day**, and **21.6 million events over 30 days** before expiration catches up. At an average of 2 seconds per check, that is about 17 busy check slots before allowing for bursts, database work, and slower requests. If many endpoints time out, the required capacity increases substantially.

Detailed events expire after 30 days. Daily summaries retain 400 days of status history; they do not preserve full response details. Attachments and audit activity also consume space, and audit records do not have automatic expiration. Monitor actual database growth instead of sizing only for the application containers.

### Add worker capacity gradually

Each worker process defaults to `CHECK_CONCURRENCY=10`, with a supported range of 1–50. Start by measuring schedule delay, queue wait, check duration, CPU, memory, and database latency. Raising concurrency helps when the bottleneck is waiting for network responses; it does not solve an overloaded database.

To try 20 simultaneous checks per worker, update `.env` and recreate the workers:

```dotenv
CHECK_CONCURRENCY=20
```

```sh
docker compose up -d --no-deps workers
```

You can also run multiple workers against the same Redis queue and database:

```sh
docker compose up -d --no-deps --scale workers=2 workers
```

Two replicas at concurrency 20 allow up to 40 concurrent check jobs in total. They also add database connections and background activity. Keep the same worker scale in later deployment commands if you intend to retain both replicas. BullMQ supports both approaches; see its [worker concurrency documentation](https://docs.bullmq.io/guide/workers/concurrency).

Keep a single scheduler for a simple deployment. `SCHEDULER_INTERVAL_MS` defaults to 1,000 ms and accepts 250–5,000 ms; it controls dispatch frequency, not an individual monitor's interval. The minimum monitor interval remains one minute. The current dispatcher considers up to 200 due monitors per pass, so accumulated backlog can also affect timing.

### Understand quotas and infrastructure limits

The default workspace quota is **50 real monitors**, including paused ones; demo monitors do not consume that quota. It is a guardrail, not a hardware capacity estimate. The admin API at `GET /api/settings/workspace` and `PUT /api/settings/workspace` supports a `monitorLimit` of 1–10,000. Updates require the complete validated settings object and its current `revision`, and cannot reduce the limit below current usage. The Settings UI does not yet expose this control. See the [settings route](api/src/routes/workspace-settings.js) and [validation rules](shared/domain/workspace-settings.js) for the current contract.

Once one host is genuinely constrained, move the database and Redis to appropriately sized services and run workers separately. Keep all instances on the same database, queue, and credential-encryption key. The supplied Compose files use a bundled Redis service; external Redis needs a deployment override, not just an unused variable in `.env`. PostgreSQL currently allows up to five pool connections per application process, so include every replica when planning connections.

Do not treat more replicas as automatic high availability. The database, Redis, scheduler, encryption-key storage, and network still need a recovery plan. API scaling also requires reviewing proxy configuration and process-local rate limiting. If the frontend or API stops, already-running workers can continue checking while their dependencies remain available. If workers or the scheduler stop, checks can be delayed or missed; the app cannot reconstruct observations it never made.

## Deploying beyond your laptop

The default Compose frontend binds to loopback. For remote access, put it behind an HTTPS reverse proxy, set `APP_ORIGIN` to the exact application origin, and set `COOKIE_SECURE=true`. Keep the database and Redis off the public internet. Configure proxy trust for your actual deployment rather than accepting arbitrary forwarded headers.

Back up the database, the integration-encryption key, and the persistent Redis data. Test restoration into an isolated environment. Preserve the database name and volume names during upgrades. If using PostgreSQL, follow its backup procedure rather than MongoDB-specific commands.

Checks currently target public HTTP/HTTPS addresses on standard ports. Private and reserved addresses are blocked, and followed redirects are revalidated. Self-hosting does not automatically enable scanning an internal network. These are HTTP availability checks, not TCP, database, or full infrastructure monitoring.

ServiceKraken is currently alpha. It does not include SSO/MFA, password-reset email, SMS/voice paging, multi-step on-call escalation, or a hosted uptime SLA. Test upgrades and backup restores in an isolated environment before updating a pilot deployment. Automated tests are useful checks, but they are not a guarantee of production readiness.

Before calling it beta, I want the core workflows to be stable, upgrade and recovery procedures to be validated, permissions and integrations to have broader testing, and realistic load tests to establish capacity. There is no committed beta release date.

See [operations and recovery](docs/operations.md), [database deployment](docs/database-backends.md), and [audit-log coverage](docs/audit-log.md) for more detail.

## Public status pages

Open **Service status → Manage status page**, choose **Public**, and save. The public link uses `/status/public/<token>` and displays service health without the application sidebar. Switching back to Private revokes anonymous access. The page refreshes every 30 seconds.

Admins can upload a branding icon and publish a global banner or service-specific message with Information, Maintenance, Warning, or Critical severity. Disabled messages remain drafts. Messages are plain text and do not change measured health. Only publish information intended for your public audience.

History supports 7, 14, and 30 days, plus the current and previous UTC calendar quarters. The chosen range is included in the URL. Missing or expired observations are shown as unavailable rather than assumed healthy.

### Email and RSS subscriptions

Public visitors can use **Subscribe by email** or copy the **RSS feed** link into their feed reader. RSS needs no email provider. Feeds include the latest 50 public updates within the last 30 days.

To enable email, configure and enable an email integration under **Integrations**, then open **Service status → Settings → Subscriptions**. Enable **Email updates**, select that integration, and set **Public origin** to your reachable HTTPS origin (for example, `https://status.example.com`). Local development allows HTTP on localhost. Your SMTP provider must authorize the sender address. SendGrid and other providers offering authenticated SMTP can use this integration.

Subscribers must confirm their email address using a link that expires after 24 hours. Each email includes an unsubscribe link; visitors confirm that action on the page, so email link scanners cannot unsubscribe them automatically. Repeat signup requests do not send duplicate confirmations during that period. Unsubscribe still works when the page is private.

Workers check for public service-health changes and published banner/service-message changes every 10 seconds. Unchanged checks do not generate emails. Internal incidents, work notes, monitor endpoints, response bodies, and drafts are excluded. Turning the page private stops new public deliveries and RSS access; previously delivered emails or cached feeds cannot be recalled.

Keep the API, workers, Redis, and database running. Delivery jobs survive restarts, retry transient email failures up to five times, and expire after seven days. Delivery is at least once: an interruption after SMTP acceptance can cause a duplicate email. Pending subscribers expire after 24 hours; confirmed subscriptions remain until unsubscribed. Delivery metadata is retained for seven days. Signup has per-IP and per-page limits; for multiple API replicas, also apply shared rate limiting at your reverse proxy and provider sending limits. Confirmation and update delivery failures are recorded in the `statusMail` collection without SMTP error details or credentials.

### Serve a public status page on your own domain

DNS alone cannot point to a URL path. Point your status domain at an HTTPS reverse
proxy, obtain a TLS certificate, and proxy to the app's port (8090 by default).
For example, add the following locations to your TLS-enabled Nginx server for
`status.example.com`. Replace `YOUR_PUBLIC_TOKEN` with the token from the public
link. This example assumes the proxy runs on the Docker host.

```nginx
location = / {
    return 302 /status/public/YOUR_PUBLIC_TOKEN;
}
location = /status/public/YOUR_PUBLIC_TOKEN {
    proxy_pass http://127.0.0.1:8090;
}
location = /api/public/status/YOUR_PUBLIC_TOKEN {
    limit_except GET { deny all; }
    proxy_pass http://127.0.0.1:8090;
}
location = /api/public/status/YOUR_PUBLIC_TOKEN/icon {
    limit_except GET { deny all; }
    proxy_pass http://127.0.0.1:8090;
}
location = /api/public/status/YOUR_PUBLIC_TOKEN/feed.xml {
    limit_except GET { deny all; }
    proxy_pass http://127.0.0.1:8090;
}
location ~ ^/api/public/status/YOUR_PUBLIC_TOKEN/subscriptions(/confirm|/unsubscribe)?$ {
    limit_except POST { deny all; }
    proxy_pass http://127.0.0.1:8090;
}
location /assets/ {
    proxy_pass http://127.0.0.1:8090;
}
location = /favicon.svg {
    proxy_pass http://127.0.0.1:8090;
}
location = /theme-init.js {
    proxy_pass http://127.0.0.1:8090;
}
location / {
    return 404;
}
```

Keep the private app on its existing origin. Set **Public origin** in status settings to this domain. Public requests stay
same-origin; subscription writes accept only the configured status origin or app
origin. No change to `APP_ORIGIN` is needed. DNS, proxy configuration, and TLS certificates remain deployment tasks;
the app does not provision domains or certificates.

## Local development

The stack uses React and Tailwind CSS, Express with ESM, the MongoDB driver or PostgreSQL adapter, and BullMQ with Redis. The code is JavaScript; Node.js 24 or newer is required.

```sh
npm ci
docker compose -f compose.yaml -f compose.dev.yaml up -d mongo redis
```

Run each process in its own terminal:

```sh
APP_ORIGIN=http://localhost:5173 npm run dev:api
npm run dev:app
npm run dev:workers
npm run dev:scheduler
```

Open <http://localhost:5173>. Vite proxies `/api` to port 3000 and reloads frontend changes during development. Do not run local and Docker workers/schedulers against the same queue unintentionally.

Local API and workers share `.servicekraken/integration.key` automatically. If overriding its location, give both processes the same absolute `INTEGRATION_KEY_FILE`. Never commit that key, `.env`, database backups, or real provider credentials.

### Repository layout

```text
api/       Express API, authentication, routes, and workspace authorization
app/       React application, shared UI, forms, and query caching
workers/   Check execution, scheduling, notification delivery, and maintenance
shared/    Validation, form schemas, integration rules, and persistence adapters
test/      Unit tests and disposable-database integration tests
docs/      Architecture, deployment, and operational guidance
```

See [architecture](docs/architecture.md) for conventions when extending the app.

### Checks and formatting

```sh
npm run lint
npm test
npm run build
npm run format:check

docker compose -f compose.yaml -f compose.test.yaml run --build --rm test
```

`npm run format` applies the shared Prettier rules. Integration tests use isolated database names and clean up their test data. Provider tests use mocked requests; they do not send real notifications or establish compatibility with every provider account configuration.

## Contributing

If something is confusing, broken, or harder than it should be, open an issue with the steps to reproduce it and what you expected. For a larger change, describe the problem before building a broad solution. Keep changes focused, preserve workspace authorization and server-side validation, and include useful tests where behavior changes.

Remove credentials, webhook URLs, session cookies, and private record data from logs or screenshots before sharing them. Please do not post exploitable security details or secrets in a public issue; use GitHub's private vulnerability reporting if enabled or arrange a private channel with the maintainer.

## License

ServiceKraken is available under the [MIT License](LICENSE). My intention is to keep this a useful, freely available tool that developers and small teams can run and adapt. Hosting and any third-party services you choose remain your responsibility.
