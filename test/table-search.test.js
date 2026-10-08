import test from 'node:test';
import assert from 'node:assert/strict';
import { incidentQuery } from '../api/src/domain/incidents.js';
import { workQuery } from '../shared/domain/work.js';

/** Server searches must preserve access restrictions and reject arbitrary field paths. */
test('server column search is allowlisted, literal, and keeps incident visibility', () => {
  const req = { workspaceId: 'workspace', role: 'user', user: { _id: 'user' } };
  const { filter } = incidentQuery({ search: 'api.*', searchColumn: 'serviceName' }, req);
  assert.equal(filter.workspaceId, 'workspace');
  assert.equal(filter.$or.length, 2);
  const match = filter.$expr.$or[0].$regexMatch;
  assert.equal(match.input.$convert.input, '$serviceName');
  assert.equal(match.regex, 'api\\.\\*');
  assert.equal(incidentQuery({ search: 'api' }, req).filter.$expr.$or.length, 6);
  assert.equal(
    incidentQuery({ search: 'Platform', searchColumn: 'assignmentGroupName' }, req).filter.$expr.$or
      .length,
    1,
  );
  assert.throws(() => incidentQuery({ searchColumn: '$where' }, req));
  assert.equal(
    workQuery({ search: 'Maya', searchColumn: 'assignee' }, 'workspace', 'tasks').filter
      .workspaceId,
    'workspace',
  );
  assert.throws(() => workQuery({ searchColumn: 'assignee' }, 'workspace', 'knowledge'));
});
