import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import {
  BUILTIN_FIELDS,
  validateFields,
  validateChoices,
  resolveChoices,
  validateValues,
} from '../shared/forms/schema.js';
import { fieldChoices, workBuiltinFields } from '../shared/forms/form-options.js';

const id = () => new ObjectId().toHexString();
test('built-in dropdown values cannot be deleted or remapped; custom choices require canonical meaning', () => {
  const options = fieldChoices('incidents', { id: 'status' });
  assert.throws(() => validateChoices(options.slice(1), 'incidents', 'status'), /cannot|instead/);
  assert.throws(
    () =>
      validateChoices(
        options.map((row) => ({ ...row, base: 'resolved' })),
        'incidents',
        'status',
      ),
    /meanings/,
  );
  assert.throws(
    () =>
      validateChoices(
        [...options, { value: id(), label: 'Waiting', base: 'invented' }],
        'incidents',
        'status',
      ),
    /Choose/,
  );
  assert.throws(
    () =>
      validateChoices(
        options.map((row) => ({ ...row, hidden: true })),
        'incidents',
        'status',
      ),
    /visible/,
  );
  const added = { value: id(), label: 'Waiting on vendor', base: 'open', hidden: false };
  const choices = validateChoices([...options, added], 'incidents', 'status');
  const schema = validateFields(
    BUILTIN_FIELDS.map((field) => (field.id === 'status' ? { ...field, choices } : field)),
  );
  const result = resolveChoices({ statusOption: added.value }, schema, 'incidents');
  assert.equal(result.status, 'open');
  assert.equal(result.statusLabel, 'Waiting on vendor');
  const hidden = schema.map((field) =>
    field.id === 'status'
      ? {
          ...field,
          choices: choices.map((row) =>
            row.value === added.value ? { ...row, hidden: true } : row,
          ),
        }
      : field,
  );
  assert.throws(
    () => resolveChoices({ statusOption: added.value }, hidden, 'incidents'),
    /available/,
  );
  assert.equal(
    resolveChoices({ statusOption: added.value }, hidden, 'incidents', result).status,
    'open',
  );
});
test('hidden and removed custom choices reject new values but preserve saved historical values', () => {
  const field = {
    id: id(),
    label: 'Environment',
    type: 'select',
    required: true,
    options: ['Production', 'Staging'],
    hiddenOptions: ['Staging'],
  };
  assert.throws(() => validateValues({ [field.id]: 'Staging' }, [field]), /Choose/);
  assert.equal(
    validateValues({ [field.id]: 'Staging' }, [field], { [field.id]: 'Staging' })[field.id],
    'Staging',
  );
  assert.equal(
    validateValues({ [field.id]: 'Legacy' }, [field], { [field.id]: 'Legacy' })[field.id],
    'Legacy',
  );
  const builtins = workBuiltinFields('tasks');
  const previous = [...builtins, field];
  assert.throws(
    () => validateFields([...builtins, { ...field, type: 'number' }], previous, builtins, 'tasks'),
    /change its type/,
  );
});
