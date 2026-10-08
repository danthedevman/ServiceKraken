import { Query } from './query.js';
import { decode } from './codec.js';

/** Server-side cursor keeps exports bounded while filters, sorting and pages execute in SQL. */
export class Cursor {
  constructor(repository, filter = {}, options = {}, pipeline = null) {
    Object.assign(this, {
      repository,
      filter,
      options,
      pipeline,
      order: {},
      offset: 0,
      size: null,
      batch: 100,
      closed: false,
    });
  }
  sort(value) {
    this.order = value;
    return this;
  }
  skip(value) {
    this.offset = this.bound(value);
    return this;
  }
  limit(value) {
    this.size = this.bound(value);
    return this;
  }
  batchSize(value) {
    this.batch = Math.max(1, Math.min(1000, this.bound(value)));
    return this;
  }
  project(value) {
    this.options.projection = value;
    return this;
  }
  bound(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid query limit');
    return value;
  }
  compile() {
    const q = new Query();
    let sql = `SELECT data FROM ${this.repository.table}`;
    if (this.pipeline) {
      for (const stage of this.pipeline) {
        const [[op, arg]] = Object.entries(stage);
        if (op === '$match') sql = `SELECT data FROM (${sql}) stage WHERE ${q.filter(arg)}`;
        else if (op === '$sort') sql = `SELECT data FROM (${sql}) stage ORDER BY ${q.sort(arg)}`;
        else if (op === '$skip') sql = `SELECT data FROM (${sql}) stage OFFSET ${this.bound(arg)}`;
        else if (op === '$count')
          sql = `SELECT jsonb_build_object(${q.param(arg, 'text')}, count(*)) AS data FROM (${sql}) stage`;
        else if (op === '$limit') sql = `SELECT data FROM (${sql}) stage LIMIT ${this.bound(arg)}`;
        else if (op === '$project') sql = `SELECT ${q.project(arg)} AS data FROM (${sql}) stage`;
        else if (op === '$set' || op === '$addFields')
          sql = `SELECT data || ${q.expression(arg)} AS data FROM (${sql}) stage`;
        else if (op === '$group') {
          const group = q.expression(arg._id);
          const fields = [q.param('_id', 'text'), 'group_key'];
          const sums = [];
          let index = 0;
          for (const [name, accumulator] of Object.entries(arg)) {
            if (name === '_id') continue;
            const [[operator, value]] = Object.entries(accumulator);
            const expression = q.expression(value);
            let aggregate;
            if (operator === '$sum') aggregate = `to_jsonb(SUM((${expression} #>> '{}')::numeric))`;
            else if (operator === '$first') aggregate = `(jsonb_agg(${expression})->0)`;
            else throw new Error(`Unsupported accumulator: ${operator}`);
            const alias = `aggregate_${index++}`;
            sums.push(`${aggregate} AS ${alias}`);
            fields.push(q.param(name, 'text'), alias);
          }
          sql = `SELECT jsonb_build_object(${fields.join(',')}) AS data FROM (SELECT group_key, ${sums.join(',')} FROM (SELECT data, ${group} AS group_key FROM (${sql}) source) grouped GROUP BY group_key) totals`;
        } else if (op === '$merge') {
          // Only the idempotent status-history merge is part of the application contract.
          if (arg.into !== 'statusDaily') throw new Error('Unsupported report destination');
          sql = `INSERT INTO "statusDaily" AS saved (id,data) SELECT (data->'_id')::text,data FROM (${sql}) rollups ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data WHERE (EXCLUDED.data->>'total')::numeric >= (saved.data->>'total')::numeric RETURNING data`;
        } else throw new Error(`Unsupported report stage: ${op}`);
      }
    } else {
      sql = `SELECT ${q.project(this.options.projection)} AS data FROM ${this.repository.table} WHERE ${q.filter(this.filter)}`;
      if (Object.keys(this.order).length) sql += ` ORDER BY ${q.sort(this.order)}`;
      if (this.size !== null) sql += ` LIMIT ${this.size}`;
      if (this.offset) sql += ` OFFSET ${this.offset}`;
    }
    return { text: sql, values: q.values };
  }
  async toArray() {
    const { rows } = await this.repository.pool.query(this.compile());
    return rows.map((r) => decode(r.data));
  }
  async close() {
    this.closed = true;
  }
  async *[Symbol.asyncIterator]() {
    const client = await this.repository.pool.connect();
    try {
      await client.query('BEGIN READ ONLY');
      const query = this.compile();
      await client.query({
        text: `DECLARE sk_export NO SCROLL CURSOR FOR ${query.text}`,
        values: query.values,
      });
      while (!this.closed) {
        const { rows } = await client.query(`FETCH FORWARD ${this.batch} FROM sk_export`);
        if (!rows.length) break;
        for (const row of rows) {
          if (this.closed) break;
          yield decode(row.data);
        }
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
