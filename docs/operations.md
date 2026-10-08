# Deployment and recovery

## Configuration

| Variable                       | Default                                | Purpose                                                                       |
| ------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------- |
| `APP_PORT`                     | `8090`                                 | Local Docker frontend port.                                                   |
| `APP_ORIGIN`                   | `http://127.0.0.1:8090`                | Allowed application browser origin.                                           |
| `COOKIE_SECURE`                | `false`                                | Set `true` behind HTTPS.                                                      |
| `MONGODB_DB`                   | `servicekraken`                        | Database name; retain the current value during upgrades.                      |
| `MONGO_VOLUME_NAME`            | `servicekraken-mongo-data`             | Override to reuse an existing deployment volume.                              |
| `REDIS_VOLUME_NAME`            | `servicekraken-redis-data`             | Override to reuse an existing queue volume.                                   |
| `INTEGRATION_KEYS_VOLUME_NAME` | `servicekraken-integration-keys`       | Persistent credential-encryption key volume.                                  |
| `INTEGRATION_KEY_FILE`         | Docker: `/srv/secrets/integration.key` | Shared key location; use one absolute path for local API/workers.             |
| `INTEGRATION_ENCRYPTION_KEY`   | automatic                              | Optional legacy/operator 64-hex override; must match the persisted key.       |
| `CHECK_CONCURRENCY`            | `10`                                   | Concurrent check jobs; range 1–50.                                            |
| `SCHEDULER_INTERVAL_MS`        | `1000`                                 | Dispatcher interval, 250–5,000 ms; does not reduce monitor minimum intervals. |
| `MARKETING_ORIGIN`             | `http://127.0.0.1:8091`                | Exact contact-form origin.                                                    |
| `PUBLIC_REPOSITORY_URL`        | empty                                  | Published HTTPS repository URL.                                               |
| `MARKETING_OWNER_EMAIL`        | empty                                  | Existing admin account authorized to read hosting inquiries.                  |

SMTP settings are managed in the UI. Existing `SMTP_*` worker environment settings remain a migration fallback, but use the UI for new integrations. A fresh API/worker pair automatically persists one shared encryption key. An invalid or mismatched key fails startup instead of silently making old credentials unreadable.

## Backups

Back up MongoDB (including users, services, events, attachments, configuration, and inquiries) and the integration-key volume together. Losing the encryption key means saved integration passwords cannot be decrypted. Redis persistence holds queued work; preserve it when recovering the same deployment.

Use a consistent database backup method such as `mongodump` and test restoring into an isolated deployment. Treat key backups and database dumps as secrets. Never commit them. Record the volume names and database name outside the running containers.

When renaming a deployment, keep existing volume names through the override variables above and preserve `MONGODB_DB`. Stop the old stack before starting a renamed stack on the same volumes. Do not run two MongoDB containers against one data volume. Cookie-name changes require signing in again; user records and passwords remain in MongoDB.

## Public deployment

Local Compose binds ports to loopback. Put a TLS reverse proxy in front of the appropriate service, set the exact public origins, and enable secure application cookies. Configure trusted proxies only for the actual proxy topology; never trust arbitrary forwarded headers. Do not expose MongoDB or Redis publicly. Keep dependencies patched and apply host/network access controls.

## Troubleshooting

- **Route not found after a UI change:** rebuild the API and frontend together; stale containers may not contain the endpoint.
- **Origin rejected:** use the exact configured origin or update `APP_ORIGIN`/`MARKETING_ORIGIN` and recreate the service.
- **Notification failed:** inspect Recent deliveries, verify credentials/provider permissions, and retry after fixing configuration. Do not assume an email was delivered solely because it was queued.
- **Slow check start:** inspect queue delay and schedule delay. Increase worker capacity only after checking database and network bottlenecks.
- **Partial demo batch:** use Delete demo data to remove the interrupted batch before trying again.
