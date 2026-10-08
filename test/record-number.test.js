import test from 'node:test';
import assert from 'node:assert/strict';
import { recordNumber } from '../app/src/lib/record-number.js';

test('record numbers retain the complete ID and remain stable across record edits', () => {
  const id = '0123456789abcdef01234567';
  const number = recordNumber('incidents', { id, title: 'First title' });
  assert.equal(number, recordNumber('incidents', { id, title: 'Updated title' }));
  assert.notEqual(number, recordNumber('incidents', { id: '1123456789abcdef01234567' }));
  assert.notEqual(number, recordNumber('tasks', { id }));
  assert.equal(recordNumber('incidents', { id, number: 'INC0000123' }), 'INC0000123');
  assert.equal(recordNumber('incidents', null), '');
});
