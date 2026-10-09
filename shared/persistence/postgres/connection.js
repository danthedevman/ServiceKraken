import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { identifier, migrate } from './migrations.js';
import { Repository } from './repository.js';

/** Connect to the selected PostgreSQL schema. TLS always verifies certificates when enabled. */
export async function connectPostgres() {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required for PostgreSQL');
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('Use a PostgreSQL DATABASE_URL');
  if (process.env.DATABASE_SSL === 'true') {
    for (const parameter of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert'])
      url.searchParams.delete(parameter);
    connectionString = url.toString();
  }
  const schema = process.env.DATABASE_SCHEMA || 'servicetrident';
  identifier(schema);
  const ssl =
    process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized: true,
          ...(process.env.DATABASE_CA_FILE
            ? { ca: await readFile(process.env.DATABASE_CA_FILE, 'utf8') }
            : {}),
        }
      : undefined;
  const pool = new pg.Pool({
    connectionString,
    ssl,
    max: 5,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
    idle_in_transaction_session_timeout: 30000,
    options: `-c search_path=${schema},pg_catalog`,
  });
  pool.on('error', () => console.error('PostgreSQL idle connection failed'));
  try {
    await migrate(pool, schema);
  } catch (error) {
    await pool.end();
    throw error;
  }
  const repositories = new Map();
  const db = {
    provider: 'postgres',
    collection(name) {
      if (!repositories.has(name)) repositories.set(name, new Repository(pool, name));
      return repositories.get(name);
    },
    async command(command) {
      if (command.ping !== 1) throw new Error('Unsupported database command');
      await pool.query('SELECT 1');
      return { ok: 1 };
    },
    async dropDatabase() {
      if (
        !/^(test_|[a-z_]+_test_|http_only_|resolution_|marketing_|services_|operations_|demo_|preferences_|role_preview_|work_)/.test(
          schema,
        )
      )
        throw new Error('Only disposable test schemas can be dropped');
      await pool.query(`DROP SCHEMA ${identifier(schema)} CASCADE`);
    },
    /** Replaces TTL indexes with periodic, idempotent SQL deletion. */
    async cleanupExpired() {
      const { rows } = await pool.query('SELECT * FROM sk_expiration');
      for (const row of rows) {
        const repo = db.collection(row.name);
        await repo.deleteMany({ [row.field]: { $lte: new Date(Date.now() - row.seconds * 1000) } });
      }
    },
    pool,
  };
  return { db, client: { close: () => pool.end() } };
}
