import { MongoClient } from 'mongodb';

/** Connect to MongoDB and initialize indexes shared by the API and workers.
 * @returns {Promise<{client: MongoClient, db: import('mongodb').Db}>}
 */
export async function connectMongo() {
  const client = new MongoClient(
    process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
    {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 15,
    },
  );
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? 'servicetrident');
  return { client, db };
}
