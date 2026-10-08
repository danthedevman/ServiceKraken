import { ObjectId } from 'mongodb';
import { InputError } from '@servicekraken/shared/validation/validation';

/** @param {string} value @returns {ObjectId} */
export function objectId(value) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value))
    throw new InputError('Invalid identifier.');
  return new ObjectId(value);
}
