# Apply updates to the running app

- After making application, dependency, or configuration changes, rebuild and restart the affected local services before reporting completion so the running app reflects the changes. Do not stop at editing files or producing a build.
- For Docker Compose services, use `docker compose up -d --build --wait` with the affected service names. A restart alone does not pick up code copied into an image. Include API, workers, and scheduler when shared code affects them.
- Verify affected containers are healthy and check the application/API through its normal local URL. Report any failure that prevents the update from becoming available.
- Use the existing active Compose project and persistent volumes. Preserve databases and integration encryption keys; never run two database containers against the same data volume or delete volumes to apply an update.
- Documentation-only changes do not require restarting services.
