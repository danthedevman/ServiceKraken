import { ensureIntegrationKey } from '@servicetrident/shared/integrations/integration-key';
import { connectDatabase } from '@servicetrident/shared/persistence/database';
import { createApp } from './app.js';

await ensureIntegrationKey();
const { client, db } = await connectDatabase();
const server = createApp(db).listen(Number(process.env.PORT ?? 3000), '0.0.0.0', () =>
  console.log('API listening on port', process.env.PORT ?? 3000),
);
server.requestTimeout = 15000;
server.headersTimeout = 10000;

/** Stop accepting requests before closing database connections. */
function shutdown() {
  server.close(async () => {
    await client.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 15000).unref();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
