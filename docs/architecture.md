# Architecture and maintenance

ServiceTrident is one product with separate web, API, scheduling, and worker processes. Keep the separation functional; a new folder should own a clear responsibility rather than wrap a single call unnecessarily.

## Request flow

1. Express applies security headers, request limits, origin/content checks, and authentication in `api/src/app.js`.
2. Role gates protect the route groups. Feature routes scope database access to the authenticated workspace. Public status and marketing submissions have explicit, limited routes.
3. Routes validate input and delegate shared business rules or persistence to domain/repository modules.
4. Serializers allowlist client-visible fields. Do not return raw credential documents.

Register public endpoints before authentication and workspace endpoints afterward. Keep the end-user incident-portal restrictions before ordinary feature routes. Do not move a route across these boundaries during refactoring.

## Frontend conventions

`main.jsx` only mounts the app. `application.jsx` owns providers and route registration. Feature modules own their forms, tables, and detail views. Shared components own layout and accessibility.

Use `useResource` for reads and `writeApi`/`useSave` for mutations. Session changes cancel and remove private cached data. Never persist private records in local storage. Only theme/layout preferences belong there. Preserve drafts during polling, keep loading feedback local, and do not reintroduce skeletons or page fades.

Use DataTable for all tables, including exports. A remote table supplies `remote.filtersActive` so the closed filter button can indicate an active filter. Filter UI belongs in `filters`; navigation tabs belong in `toolbar`. Hiding controls must not clear filters or change exported rows.

Forms use dedicated routes except the explicit on-call quick-add dialog. Use the shared Modal and RecordWorkspace rather than inventing new navigation offsets. Built-in form fields and options retain their immutable IDs/meanings; custom additions map to canonical reporting values.

## Jobs and integrations

The scheduler dispatches due monitors independently from check workers. Claims use MongoDB server time and enforce at least one minute between starts. Fixed job IDs reduce duplicate dispatches. Check results are stored in events; in-flight checks cannot overwrite a monitor after its request configuration changes.

Keep network transports in workers. API routes save encrypted configuration but do not make outbound checks. Monitors check public HTTP/HTTPS endpoints using HEAD or GET. Extend the shared provider catalog, shared validation, API configuration, worker adapter, UI form, and tests together when adding a provider.

Notification reconciliation writes durable delivery records. The delivery worker performs network I/O separately with retries and sanitized errors. Never store raw provider exceptions, passwords, or connection strings in event history. Demo tags always exclude a record from outbound processing.

## Module boundaries

- `shared/validation` and `shared/forms` are small, reusable rules.
- `shared/integrations/secrets.js` and persistence modules are Node-only; do not import them in browser code.
- API repositories coordinate common persistence, including optimistic-concurrency updates.
- Marketing templates contain only application-authored HTML. Runtime configuration is escaped. Contact data is rendered as text in the React inbox.

Every nontrivial exported function should have JSDoc describing its responsibility and relevant input/output or safety boundary. Prefer explicit code over generic service frameworks. Run lint, formatting, build, unit tests, and the affected integration tests after moving modules.

## Storage and table reads

`shared/persistence/database.js` selects MongoDB or PostgreSQL. The MongoDB implementation uses the native driver; PostgreSQL implements the bounded document-repository contract in separate query, cursor, codec, update, migration, and connection modules. See `docs/database-backends.md` for deployment and schema tradeoffs. Do not add persistence operators without parity tests.

Every DataTable now uses an explicit server source or an existing remote endpoint. The browser holds page/query state, not a complete dataset for filtering. `/api/tables/:kind` owns its source and column allowlists and reuses the same authorization and filters for CSV export. Growing record collections use database queries; bounded embedded configuration is filtered on the API. `/api/references/:type` returns at most 30 matches plus separately authorized selected labels. The table/reference route modules enforce their own role restrictions immediately after authentication.
