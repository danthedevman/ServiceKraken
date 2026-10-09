import test from 'node:test';
import assert from 'node:assert/strict';
import { tableRecordLink } from '../app/src/lib/table-record-link.js';

test('table launch links resolve known records and do not invent detail pages', () => {
  assert.equal(tableRecordLink('members', '/members', { id: 'person' }), '/workspace/person');
  assert.equal(
    tableRecordLink('monitors?serviceId=service', undefined, { id: 'check' }),
    '/monitors/check',
  );
  assert.equal(tableRecordLink(undefined, '/incidents', { id: 'incident' }), '/incidents/incident');
  assert.equal(
    tableRecordLink('incident-knowledge?recordId=incident', undefined, { id: 'article' }),
    '/knowledge/article',
  );
  assert.equal(tableRecordLink('headers', undefined, { id: 'header' }), null);
  assert.equal(
    tableRecordLink('inquiries', '/settings/marketing/inquiries', { id: 'inquiry' }),
    null,
  );
  assert.equal(tableRecordLink('services', undefined, {}), null);
  assert.equal(tableRecordLink('services', undefined, { id: '../other' }), '/services/..%2Fother');
});
