import { createHash } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { Query } from './query.js';
import { Cursor } from './cursor.js';
import { encode, decode, key } from './codec.js';
import { updateRecord } from './updates.js';
import { identifier, tables } from './migrations.js';

/** Normalize uniqueness violations to the existing repository conflict contract. */
function conflict(error) {
  if (error.code === '23505') error.code = 11000;
  return error;
}

/** Named document repository backed by SQL, with atomic compare-and-set writes and bounded reads. */
export class Repository {
  constructor(pool, name) {
    if (!tables.includes(name)) throw new Error('Unknown repository');
    this.pool = pool;
    this.name = name;
    this.table = identifier(name);
  }
  find(filter = {}, options = {}) {
    return new Cursor(this, filter, options);
  }
  aggregate(pipeline) {
    return new Cursor(this, {}, {}, pipeline);
  }
  async findOne(filter = {}, options = {}) {
    return (await this.find(filter, options).limit(1).toArray())[0] ?? null;
  }
  async countDocuments(filter = {}) {
    const q = new Query();
    const { rows } = await this.pool.query(
      `SELECT count(*)::integer AS count FROM ${this.table} WHERE ${q.filter(filter)}`,
      q.values,
    );
    return rows[0].count;
  }
  async insertOne(row) {
    row._id ??= new ObjectId();
    try {
      await this.pool.query(`INSERT INTO ${this.table}(id,data) VALUES ($1,$2::jsonb)`, [
        key(row._id),
        JSON.stringify(encode(row)),
      ]);
    } catch (error) {
      throw conflict(error);
    }
    return { acknowledged: true, insertedId: row._id };
  }
  async insertMany(rows) {
    const insertedIds = {};
    for (const [index, row] of rows.entries())
      insertedIds[index] = (await this.insertOne(row)).insertedId;
    return { acknowledged: true, insertedCount: rows.length, insertedIds };
  }
  async updateOne(filter, update, options = {}) {
    return this.mutate(filter, update, options, false);
  }
  async updateMany(filter, update, options = {}) {
    return this.mutate(filter, update, options, true);
  }
  async findOneAndUpdate(filter, update, options = {}) {
    return (await this.mutate(filter, update, options, false)).record;
  }
  async deleteOne(filter) {
    return this.mutate(filter, null, {}, false);
  }
  async deleteMany(filter) {
    const q = new Query();
    const result = await this.pool.query(
      `DELETE FROM ${this.table} WHERE ${q.filter(filter)}`,
      q.values,
    );
    return { acknowledged: true, deletedCount: result.rowCount };
  }
  async findOneAndDelete(filter) {
    return (await this.mutate(filter, null, {}, false)).record;
  }
  async mutate(filter, update, options, many) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize insert-if-absent operations; ordinary updates lock only matching rows.
      if (options.upsert)
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`upsert:${this.name}`]);
      const q = new Query();
      const { rows } = await client.query(
        `SELECT id,data,statement_timestamp() AS now FROM ${this.table} WHERE ${q.filter(filter)} ${many ? '' : 'LIMIT 1'} FOR UPDATE`,
        q.values,
      );
      const matchedCount = rows.length;
      let insertedId;
      if (!rows.length && options.upsert) {
        const base = Object.fromEntries(
          Object.entries(filter).filter(
            ([k, v]) =>
              !k.startsWith('$') &&
              (!v || typeof v !== 'object' || v._bsontype || v instanceof Date),
          ),
        );
        base._id ??= new ObjectId();
        const { rows: time } = await client.query('SELECT statement_timestamp() AS now');
        rows.push({ id: key(base._id), data: encode(base), now: time[0].now });
        insertedId = base._id;
      }
      let record = null;
      for (const source of rows) {
        const before = decode(source.data);
        if (update === null) {
          await client.query(`DELETE FROM ${this.table} WHERE id=$1`, [source.id]);
          record = before;
        } else {
          const after = updateRecord(before, update, source.now, !!insertedId);
          if (key(after._id) !== key(before._id))
            throw new Error('Record identifiers cannot change');
          if (insertedId)
            await client.query(`INSERT INTO ${this.table}(id,data) VALUES($1,$2::jsonb)`, [
              source.id,
              JSON.stringify(encode(after)),
            ]);
          else
            await client.query(`UPDATE ${this.table} SET data=$2::jsonb WHERE id=$1`, [
              source.id,
              JSON.stringify(encode(after)),
            ]);
          record = options.returnDocument === 'after' ? after : before;
        }
      }
      await client.query('COMMIT');
      if (record && options.projection) {
        const q = new Query();
        const data = q.param(record);
        record = decode(
          (await this.pool.query(`SELECT ${q.project(options.projection, data)} AS data`, q.values))
            .rows[0].data,
        );
      }
      return {
        acknowledged: true,
        matchedCount,
        modifiedCount: matchedCount,
        deletedCount: update === null ? matchedCount : 0,
        upsertedId: insertedId ?? null,
        upsertedCount: insertedId ? 1 : 0,
        record,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw conflict(error);
    } finally {
      client.release();
    }
  }
  /** Create equivalent expression indexes. Index definitions are trusted application constants. */
  async createIndex(fields, options = {}) {
    const index =
      'sk_' +
      createHash('sha256')
        .update(JSON.stringify([this.name, fields, options]))
        .digest('hex')
        .slice(0, 24);
    const expr = (field) =>
      `sk_scalar(data #> ARRAY[${new Query()
        .path(field)
        .map((p) => `'${p}'`)
        .join(',')}]::text[])`;
    let predicate = '';
    if (options.sparse)
      predicate =
        ' WHERE ' +
        Object.keys(fields)
          .map((f) => `${expr(f)} IS NOT NULL`)
          .join(' AND ');
    if (options.partialFilterExpression) {
      // The only conditional unique index is the active automatic incident constraint.
      if (JSON.stringify(options.partialFilterExpression) !== '{"activeAutomatic":true}')
        throw new Error('Unsupported index predicate');
      predicate = ` WHERE data->'activeAutomatic' = 'true'::jsonb`;
    }
    await this.pool.query(
      `CREATE ${options.unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ${identifier(index)} ON ${this.table} (${Object.entries(
        fields,
      )
        .map(([f, d]) => `(${expr(f)}) ${d === -1 ? 'DESC' : 'ASC'}`)
        .join(',')})${predicate}`,
    );
    if (options.expireAfterSeconds !== undefined)
      await this.pool.query(
        'INSERT INTO sk_expiration(name,field,seconds) VALUES($1,$2,$3) ON CONFLICT(name) DO UPDATE SET field=EXCLUDED.field,seconds=EXCLUDED.seconds',
        [this.name, Object.keys(fields)[0], options.expireAfterSeconds],
      );
    return index;
  }
}
