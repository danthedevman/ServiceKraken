import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { connectDatabase } from '@servicetrident/shared/persistence/database';
import { dispatchDue } from './monitoring/processor.js';
import { positiveSetting } from './runtime/config.js';

const dispatchMs = positiveSetting('SCHEDULER_INTERVAL_MS', 1000, 5000, 250);
const { client, db } = await connectDatabase();
const connection = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});
connection.on('error', (error) =>
  console.error('Scheduler Redis error:', error.code ?? error.name),
);
const checks = new Queue('website-checks', { connection });
const schedules = new Queue('monitor-schedules', { connection });
const worker = new Worker(schedules.name, async () => dispatchDue(db, checks), {
  connection,
  concurrency: 1,
});
worker.on('error', (error) => console.error('Scheduler error:', error.code ?? error.name));
worker.on('failed', (job, error) => console.error('Dispatch failed:', error.code ?? error.name));
// Migrate the old mixed queue without deleting pending checks or their history.
await checks.removeJobScheduler('due-monitors');
await schedules.upsertJobScheduler(
  'due-monitors',
  { every: dispatchMs },
  {
    name: 'dispatch',
    data: {},
    opts: { attempts: 1, removeOnComplete: 10, removeOnFail: 20 },
  },
);
await dispatchDue(db, checks);
console.log(`Dedicated scheduler ready; dispatch every ${dispatchMs} ms.`);

/** Drain dispatch before closing Redis/Mongo; check workers run independently. */
async function shutdown() {
  const deadline = setTimeout(() => process.exit(1), 25000);
  deadline.unref();
  await worker.close();
  await Promise.all([checks.close(), schedules.close()]);
  await connection.quit();
  await client.close();
  clearTimeout(deadline);
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
