# ServiceKraken

**Know the impact. Own the response.**

ServiceKraken connects service health, incident response, tasks, knowledge, and on-call coverage. The application uses React (JavaScript), an Express ESM API, MongoDB or PostgreSQL storage, and BullMQ/Redis workers. The marketing site is maintained separately and is not included in this repository.

## Start all services

Install Docker with Compose, then from this directory:

```sh
cp .env.example .env
docker compose up -d --build
```

Do not overwrite an existing `.env` when upgrading: it may point to existing data volumes or contain an encryption-key override.

- Application: <http://127.0.0.1:8090>
- API health: <http://127.0.0.1:8090/api/health>

Create an account to own a workspace. Then create services, invite teammates, and add checks. The API, workers, scheduler, MongoDB, Redis, and frontend run separately.

```sh
docker compose ps
docker compose logs --tail=100 api workers scheduler
docker compose up -d --build app api workers scheduler
docker compose down
```

`down` stops containers and preserves volumes. **Do not use `down -v` unless you intend to delete stored data.** Changes to compiled frontend code require an image rebuild; development mode provides hot reload instead.

## Choose MongoDB or PostgreSQL

MongoDB remains the default; existing deployments keep their configuration and data. New self-hosted deployments can select PostgreSQL with `DATABASE_PROVIDER=postgres` and `DATABASE_URL`. Use `compose.postgres.yaml` for a bundled PostgreSQL server or `compose.external-db.yaml` for an existing database. Redis is required with both providers.

See [Database setup, TLS, backups, and compatibility](docs/database-backends.md) for complete configuration and startup commands. Changing the provider does not migrate existing data. MySQL and other SQL engines are not supported.

## Development and hot reload

Use Node.js 24 or newer. Start MongoDB and Redis locally through the development override:

```sh
npm ci
docker compose -f compose.yaml -f compose.dev.yaml up -d mongo redis
```

Run these in separate terminals:

```sh
APP_ORIGIN=http://localhost:5173 npm run dev:api
npm run dev:app
npm run dev:workers
npm run dev:scheduler
```

The React app runs at <http://localhost:5173> and proxies `/api` to port 3000. Use `APP_ORIGIN` for the exact frontend origin. The API and workers default to local MongoDB/Redis when run outside Docker. Do not run both local and Docker schedulers/workers against the same queue while troubleshooting.

Local API and workers share the checkout’s `.servicekraken/integration.key` automatically, regardless of their working directory. Docker shares the key volume. To override the local location, set the **same absolute `INTEGRATION_KEY_FILE`** for both processes:

```dotenv
INTEGRATION_KEY_FILE=/absolute/path/to/servicekraken/.servicekraken/integration.key
```

## Project structure

```text
api/src/
  app.js                 Middleware order and route registration
  routes/                Feature-specific HTTP handlers
  auth/                  Sessions, passwords, and role enforcement
  repositories/          Shared settings and member persistence
  domain/                Queries, serializers, and monitor validation
  fixtures/              Realistic, inert sample records
app/src/
  main.jsx               React entrypoint only
  application.jsx        Providers and routing
  auth/                  Authentication screens and role gates
  shell/                 Navigation and layout
  features/              Services, monitors, incidents, work, integrations, etc.
  components/            Shared tables, dialogs, record layout, and forms
  data/                  API requests, query cache, and mutation hooks
  preferences/           Automatic layout and theme preferences
  lib/                   Small presentation utilities
workers/src/
  index.js               Worker startup and graceful shutdown
  scheduler.js           Dedicated due-check dispatcher
  monitoring/            HTTP checks, event capture, and job claims
  notifications/         Reconciliation, delivery retries, and provider requests
  runtime/               Worker configuration validation
shared/
  domain/                Common business rules and audit metadata
  forms/                 Field schemas and configurable workflow options
  validation/            Bounded, typed input validation
  integrations/          Provider catalog, credentials, and configuration rules
  files/                 Rich content, attachments, and CSV safety
  persistence/           MongoDB connection and indexes
test/                    Unit and disposable-database integration tests
docs/                    Architecture and operational guidance
```

See [architecture](docs/architecture.md) for extension conventions and [operations](docs/operations.md) for deployment and recovery.

## Checks and formatting

```sh
npm run lint
npm test
npm run build
npm run format:check
docker compose -f compose.yaml -f compose.test.yaml run --build --rm test
```

Integration tests use isolated MongoDB database names and clean them up. The test override uses the local MongoDB and Redis services. Tests cover HTTP checks, workspace isolation, credentials, scheduling, demo cleanup, and the existing workflows. They do not send real provider notifications. `npm run format` applies the shared Prettier formatting rules.

## Core workflows

- **Services:** owners, primary contacts, dependencies, and collections. Checks require a workspace-owned service. Existing legacy unassigned HTTP monitors remain editable.
- **Checks:** HTTP/HTTPS HEAD and GET checks for APIs, health endpoints, and websites. Intervals are whole minutes, from 1 through 1,440. Events are retained for 30 days. Stale results become unknown rather than appearing healthy.
- **Incidents:** configurable mandatory fields and workflow choices, severity, assignments, linked knowledge articles, customer-facing comments, and responder/admin-only work notes. Resolve selects the resolved state and requires resolution notes by default; admins can configure this requirement. Automatic monitoring recoveries record system notes.
- **Tasks and knowledge:** related work, rich-text articles, embedded images, and authorized attachments. Attachments are stored in the configured database, not the container filesystem. Embedded article images do not also appear in attachment lists.
- **People:** admins manage configuration; responders edit incidents/tasks/articles; viewers read workspace records; users create and see incidents opened by or for them. Admin role preview does not grant the previewed role extra permissions.
- **Status:** one list of services. Private by default; explicitly public token URLs expose service status without credentials or private check details.
- **Tables:** pagination defaults to 10 rows with 25 and 50 options. Sort using column headers. Search and filters open from the Filters button; hiding them preserves applied filters. CSV export follows filtering and sorting across pages.
- **Layout:** left/right rail preferences save automatically. Modal positioning follows the available content area. Record forms scroll independently of the rails.

## Integration catalog

Configure communication apps through the UI. Credentials are encrypted with a persistent key generated automatically for the API and workers. Blank secret inputs retain saved values. The encryption key is never sent to the browser.

| Provider        | Configuration                                                | Behavior                                                                                                                |
| --------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Email / SMTP    | Host, port 465 or 587, sender, username/password, recipients | Verified TLS; on-call recipient with fallback. One enabled email integration can handle end-user comment notifications. |
| Slack           | Official incoming webhook URL                                | Escaped plain-text impact/recovery updates.                                                                             |
| Microsoft Teams | Workflow webhook with external access and a channel action   | Adaptive-card incident updates. Give the workflow a co-owner.                                                           |
| ServiceNow      | Instance root URL and integration account                    | Correlated incident creation and recovery work notes. No automatic closure.                                             |

HTTP targets remain restricted to public HTTP/HTTPS standard ports; redirects are disabled by default and revalidated when enabled.

Notification jobs have durable IDs and bounded retries. SMTP and external provider delivery can still be at-least-once if a process crashes after acceptance. Review **Recent deliveries** for failures. Provider accounts, webhooks, and network reachability must be supplied by the operator; no real credentials are bundled.

## Demo data

**Settings → Add demo data** generates 50 records per listed type, including realistic services, people, incidents, tasks, runbooks, and linked history. Only one batch may exist per workspace. Demo users cannot sign in, checks remain paused, and integrations cannot send notifications. They do not consume normal quotas.

Deletion uses internal workspace/batch markers, never names. Edits to demo records retain their marker. Comments/files added to demo incidents belong to that demo batch. Other records are retained; references from real records to deleted samples may become unavailable. Interrupted operations can be cleaned up from Settings. To use revised samples, delete the existing demo batch and add it again.

## Current limits

This is a focused service-response application, not a complete enterprise ITSM/CRM replacement. It does not currently include SSO/MFA, password-reset email, multi-step paging escalations, arbitrary database queries, full network scanning, or contractual hosted SLAs. Default workspace quotas include 50 real monitors. Capacity depends on check latency, worker concurrency, database resources, and retention; benchmark your actual workload before promising scale.

### Public status pages and announcements

An admin can open **Service status → Manage status page**, set visibility to
**Public**, and save. The public link uses `/status/public/<token>` and works
without an account or application sidebar. Switching visibility back to Private
revokes anonymous access. The page refreshes every 30 seconds.

Use the same settings page to publish a global banner or individual service
messages. Each message has an explicit display toggle and Information,
Maintenance, Warning, or Critical severity, shown with a color, icon, and label.
Disabled messages remain as drafts. Messages are plain text and do not override
measured health. Treat everything entered here as public when publishing.

#### Serve a public status page on your own domain

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

Keep the private app on its existing origin. The public page uses same-origin
read requests, so no change to `APP_ORIGIN` or cross-origin write permissions is
needed. DNS, proxy configuration, and TLS certificates remain deployment tasks;
the app does not provision domains or certificates.

### User profiles and on-call contact details

Profile and workspace member records share name, job title, department/team,
phone, time zone, location, email, role, and access status. Users can edit their
own directory details; admins can manage workspace members. Directory details
are visible to permitted workspace readers. Account email/password changes and
appearance controls are shown only on the signed-in user's own record. Changing
email or password requires the current password and rotates existing sessions.
Phone numbers are informational and do not enable SMS or voice delivery. On-call
coverage remains scheduled in UTC.

Status history can be viewed over the last 7, 14, or 30 days. The selected range
is included in the URL so a shared status link opens with the same range.

Admins can upload a status-page branding icon in status settings. PNG, JPEG, and
WebP uploads are resized to a PNG up to 256 pixels and 100 KB, stored in MongoDB,
and served only through authorized or explicitly public status routes. Removing
the icon restores the default brand. Icon changes save immediately.

Status history also offers the current UTC calendar quarter (through today) and
the previous quarter. Hourly, idempotent daily summaries are retained for 400 days,
while detailed check events still expire after 30 days. Existing available events
are summarized when workers start. Previously expired history cannot be recovered
and appears as unavailable; quarters are not assumed healthy without check data.

Database-monitor providers have been retired. On startup, existing non-HTTP monitors
are paused and their saved connection credentials are removed. Historical records
remain available for review or deletion; create an HTTP/HTTPS health check to replace
them. MongoDB and Redis remain required application infrastructure.

### Record activity history

Admins can open **Settings → Audit log** for workspace-scoped, searchable activity history and filtered CSV exports. See [audit log coverage and storage](docs/audit-log.md) for privacy, retention, and operational limitations.
