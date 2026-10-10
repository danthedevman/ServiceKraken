# Keep the app self-documenting

- Update the bundled Help guides in `app/src/features/help/topics.js` whenever user-facing behavior, workflows, permissions, or configuration changes. Update README and relevant deployment documentation when setup or operating requirements change; deliver documentation with the implementation.
- Explain current behavior, prerequisites, and actionable steps. Keep documentation consistent with the actual UI and supported capabilities. Add concise code comments for non-obvious constraints and decisions, rather than restating code.
- Add or refresh Help screenshots when a visual makes a workflow easier to follow. Capture the actual current app using an isolated browser with synthetic demo responses only. Never capture live workspace records, personal information, credentials, tokens, or integration secrets, even if later redacted. Do not seed or clean up a live workspace for screenshots.
- Store screenshots under `app/public/help/`, with descriptive filenames, useful alternative text, and captions that identify demo data and explain the relevant controls. Keep the reproducible capture instructions and demo fixtures with the repository; refresh affected screenshots after UI changes. Omit screenshots for topics where prose is clearer.

# Apply updates to the running app

- After making application, dependency, or configuration changes, rebuild and restart the affected local services before reporting completion so the running app reflects the changes. Do not stop at editing files or producing a build.
- For Docker Compose services, use `docker compose up -d --build --wait` with the affected service names. A restart alone does not pick up code copied into an image. Include API, workers, and scheduler when shared code affects them.
- Verify affected containers are healthy and check the application/API through its normal local URL. Report any failure that prevents the update from becoming available.
- Use the existing active Compose project and persistent volumes. Preserve databases and integration encryption keys; never run two database containers against the same data volume or delete volumes to apply an update.
- Documentation-only changes do not require restarting services.

# Secure development and secret handling

- Write secure code by default: validate and bound all untrusted input, enforce authentication, roles, and workspace ownership in the API, use parameterized database queries, and render content safely. Never rely on hidden UI controls for authorization.
- Never include API keys, passwords, access or refresh tokens, integration secrets, encryption keys, private records, or other sensitive data in source code, committed configuration, fixtures, tests, documentation, screenshots, logs, or generated artifacts. Do not hard-code secrets, including temporary development credentials.
- Read secrets from environment variables or the existing encrypted integration storage. Keep secret files out of version control, preserve existing encryption keys, and expose only explicitly allowlisted public fields in API responses and logs. Never print credentials or whole sensitive payloads while debugging.
- Use isolated synthetic data for development examples, tests, and screenshots. Do not copy production or live-workspace information into development artifacts. Review changed files and generated assets for accidental secret inclusion before completion; if a secret is discovered, stop exposing it, remove it from artifacts, and report the need to rotate it without repeating its value.
- Check security-sensitive behavior with meaningful authorization, tenant isolation, validation, and safe-rendering tests. Preserve attachment authorization and secret encryption when adding workflows.

- Do not display loading messages in the UI, including temporary permission or access warnings. Use skeleton placeholders, quiet pending states, and `aria-busy` where appropriate; preserve existing content during refresh. Show access-denied messages only after authentication and authorization have resolved. Keep meaningful errors and action confirmations visible.
