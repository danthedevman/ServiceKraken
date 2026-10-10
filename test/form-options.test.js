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
  const legacy = BUILTIN_FIELDS.map((field) =>
    field.id === 'status' ? { ...field, choices } : field,
  );
  const schema = validateFields(legacy, legacy);
  assert.deepEqual(validateFields(legacy), legacy);
  const relabeled = legacy.map((field) =>
    field.id === 'status'
      ? {
          ...field,
          label: 'Workflow',
          choices: choices.map((option) =>
            option.value === 'open' ? { ...option, label: 'New' } : option,
          ),
        }
      : field,
  );
  assert.equal(
    validateFields(relabeled, legacy).find((field) => field.id === 'status').label,
    'Workflow',
  );
  for (const change of [
    choices.filter((option) => option.value !== added.value),
    choices.map((option) =>
      option.value === added.value ? { ...option, base: 'resolved' } : option,
    ),
    choices.map((option) => (option.value === added.value ? { ...option, hidden: true } : option)),
  ])
    assert.throws(
      () =>
        validateFields(
          legacy.map((field) => (field.id === 'status' ? { ...field, choices: change } : field)),
          legacy,
        ),
      /cannot be removed or changed/,
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

test('admins can configure bounded plain-text help for System Fields and custom fields', () => {
  const fields = workBuiltinFields('tasks').map((field) => ({
    ...field,
    helpText: 'Explain what to enter.',
  }));
  fields.push({
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    type: 'text',
    label: 'Demo field',
    required: false,
    archived: false,
    options: [],
    helpText: 'Use a demo value.',
  });
  assert.equal(
    validateFields(fields, workBuiltinFields('tasks'), workBuiltinFields('tasks'), 'tasks')[0]
      .helpText,
    'Explain what to enter.',
  );
  assert.throws(
    () =>
      validateFields(
        fields.map((field) => ({ ...field, helpText: 'x'.repeat(1001) })),
        workBuiltinFields('tasks'),
        workBuiltinFields('tasks'),
        'tasks',
      ),
    /1000/,
  );
});
