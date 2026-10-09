import { reconcileStatusSubscriptions, processStatusMail } from './status/subscriptions.js';
import { summarizeStatusHistory } from '@servicetrident/shared/domain/status-history';
import { ensureIntegrationKey } from '@servicetrident/shared/integrations/integration-key';
import { cleanupAttachments } from '@servicetrident/shared/files/attachment-cleanup';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { connectDatabase } from '@servicetrident/shared/persistence/database';
import { reconcileOperations } from './notifications/reconcile.js';
import { processDelivery } from './notifications/delivery.js';
import { positiveSetting } from './runtime/config.js';
import { dispatchDue, processMonitor } from './monitoring/processor.js';

const concurrency = positiveSetting('CHECK_CONCURRENCY', 10, 50);
await ensureIntegrationKey();
const { client, db } = await connectDatabase();
const connection = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});
connection.on('error', (error) => console.error('Redis error:', error.code ?? error.name));
const queue = new Queue('website-checks', { connection });
const deliveries = new Queue('integration-deliveries', { connection });
const statusMail = new Queue('public-status-mail', { connection });
const statusMailWorker = new Worker(statusMail.name, (job) => processStatusMail(db, job.data.id), {
  connection,
  concurrency: 3,
});
const operations = new Queue('service-operations', { connection });
const operationsWorker = new Worker(
  operations.name,
  (job) =>
    job.name === 'public-status'
      ? reconcileStatusSubscriptions(db, statusMail)
      : job.name === 'status-history'
        ? summarizeStatusHistory(db)
        : job.name === 'cleanup-attachments'
          ? cleanupAttachments(db)
          : reconcileOperations(db, deliveries),
  { connection, concurrency: 1 },
);
const deliveryWorker = new Worker(deliveries.name, (job) => processDelivery(db, job.data.id), {
  connection,
  concurrency: 3,
});
for (const item of [operationsWorker, deliveryWorker, statusMailWorker]) {
  item.on('error', (error) => console.error('Operations worker error:', error.code ?? error.name));
  item.on('failed', (_job, error) =>
    console.error('Operations job failed:', error.code ?? error.name),
  );
}
await operations.upsertJobScheduler(
  'public-status',
  { every: 10000 },
  { name: 'public-status', data: {}, opts: { removeOnComplete: 5, removeOnFail: 20 } },
);
await operations.upsertJobScheduler(
  'status-history',
  { every: 3600000 },
  { name: 'status-history', data: {}, opts: { removeOnComplete: 5, removeOnFail: 20 } },
);
await summarizeStatusHistory(db);
await operations.upsertJobScheduler(
  'cleanup-attachments',
  { every: 60000 },
  { name: 'cleanup-attachments', data: {}, opts: { removeOnComplete: 5, removeOnFail: 20 } },
);
await operations.upsertJobScheduler(
  'reconcile-services',
  { every: 10000 },
  { name: 'reconcile', data: {}, opts: { removeOnComplete: 5, removeOnFail: 20 } },
);
const worker = new Worker(
  'website-checks',
  async (job) => {
    // Drain any legacy dispatch job left behind during the queue migration.
    if (job.name === 'dispatch') await dispatchDue(db, queue);
    else if (job.name === 'check')
      await processMonitor(db, job.data.monitorId, undefined, { queuedAt: job.data.queuedAt });
  },
  { connection, concurrency },
);
worker.on('error', (error) => console.error('Worker error:', error.code ?? error.name));
worker.on('failed', (job, error) =>
  console.error('Job failed:', job?.name, error.code ?? error.name),
);
console.log(`Check worker ready; concurrency ${concurrency}. Scheduler runs separately.`);

/** Drain active checks before closing shared connections. */
async function shutdown() {
  const deadline = setTimeout(() => process.exit(1), 25000);
  deadline.unref();
  await Promise.all([
    worker.close(),
    operationsWorker.close(),
    deliveryWorker.close(),
    statusMailWorker.close(),
  ]);
  await Promise.all([operations.close(), deliveries.close(), statusMail.close()]);
  await queue.close();
  await connection.quit();
  await client.close();
  clearTimeout(deadline);
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
