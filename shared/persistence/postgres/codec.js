import { ObjectId, Binary } from 'mongodb';

/** Preserve identifiers, timestamps and binary attachments without guessing from user strings. */
export function encode(value) {
  if (value instanceof ObjectId) return { $oid: value.toHexString() };
  if (value instanceof Date) return { $date: value.toISOString() };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array)
    return { $binary: Buffer.from(value).toString('base64') };
  if (value?._bsontype === 'Binary')
    return { $binary: Buffer.from(value.buffer).toString('base64') };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, encode(v)]),
    );
  return value;
}

/** Reverse only reserved persistence tags; HTTP validation never accepts arbitrary storage objects. */
export function decode(value) {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') {
    if (Object.keys(value).length === 1) {
      if (typeof value.$oid === 'string') return new ObjectId(value.$oid);
      if (typeof value.$date === 'string') return new Date(value.$date);
      if (typeof value.$binary === 'string')
        return new Binary(Buffer.from(value.$binary, 'base64'));
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decode(v)]));
  }
  return value;
}

/** Stable primary key for plain, object, and generated identifiers. */
export function key(value) {
  return JSON.stringify(encode(value));
}
