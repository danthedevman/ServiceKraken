import { tableSearch } from './table-search.js';
import { choice, identifier, invalid, text } from '../validation/fields.js';
import { TASK_STATUSES, ARTICLE_STATUSES } from '../forms/work-options.js';

/** Validate a complete task/article without accepting ownership or query operators. */
export function validateWork(body, kind, schema = null) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    invalid('title', 'Send a JSON object.');
  const task = kind === 'tasks';
  const result = {
    title: text(
      body.title ?? '',
      'title',
      160,
      schema ? schema.some((field) => field.id === 'title' && field.required) : true,
    ),
    status: choice(
      body.status ?? (task ? 'todo' : 'draft'),
      task ? TASK_STATUSES : ARTICLE_STATUSES,
      'status',
    ),
    serviceId: body.serviceId ? identifier(body.serviceId, 'serviceId') : null,
  };
  if (task) {
    result.description = text(body.description ?? '', 'description', 5000, false);
    result.priority = choice(body.priority ?? 'medium', ['low', 'medium', 'high'], 'priority');
    result.incidentId = body.incidentId ? identifier(body.incidentId, 'incidentId') : null;
    result.assignmentGroupId = body.assignmentGroupId
      ? identifier(body.assignmentGroupId, 'assignmentGroupId')
      : null;
    result.assigneeId = body.assigneeId ? identifier(body.assigneeId, 'assigneeId') : null;
    result.dueDate = body.dueDate ?? '';
    if (
      typeof result.dueDate !== 'string' ||
      (result.dueDate &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(result.dueDate) ||
          !Number.isFinite(Date.parse(result.dueDate)) ||
          new Date(result.dueDate).toISOString().slice(0, 10) !== result.dueDate))
    )
      invalid('dueDate', 'Enter a valid due date.');
  } else {
    result.content = text(
      body.content ?? '',
      'content',
      30000,
      schema ? schema.some((field) => field.id === 'content' && field.required) : true,
    );
    result.summary = text(body.summary ?? '', 'summary', 500, false);
  }
  return result;
}

/** Use the same workspace-scoped filters for table pages and full CSV exports. */
export function workQuery(query, workspaceId, kind) {
  const task = kind === 'tasks';
  const filter = { workspaceId };
  Object.assign(
    filter,
    tableSearch(query, {
      title: '$title',
      status: { $ifNull: ['$statusLabel', '$status'] },
      service: { $ifNull: ['$serviceName', 'Unassigned'] },
      updatedAt: '$updatedAt',
      ...(task
        ? {
            priority: { $ifNull: ['$priorityLabel', '$priority'] },
            dueDate: '$dueDate',
            assignmentGroupName: { $ifNull: ['$assignmentGroupName', 'Unassigned'] },
            assignee: { $ifNull: ['$assigneeName', 'Unassigned'] },
          }
        : {}),
    }),
  );
  if (query.status)
    filter.status = choice(query.status, task ? TASK_STATUSES : ARTICLE_STATUSES, 'status');
  else filter.status = { $ne: 'archived' };
  if (query.serviceId) filter.serviceId = identifier(query.serviceId, 'serviceId');
  if (query.incidentId && task) filter.incidentId = identifier(query.incidentId, 'incidentId');
  const sortBy = choice(
    query.sortBy ?? 'updatedAt',
    task
      ? ['title', 'status', 'priority', 'dueDate', 'createdAt', 'updatedAt', 'assignmentGroupName']
      : ['title', 'status', 'createdAt', 'updatedAt'],
    'sortBy',
  );
  const order = choice(query.order ?? 'desc', ['asc', 'desc'], 'order');
  const page = Number(query.page ?? 1),
    pageSize = Number(query.pageSize ?? 10);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || ![10, 25, 50].includes(pageSize))
    invalid('page', 'Choose a valid page and 10, 25, or 50 rows.');
  return { filter, sort: { [sortBy]: order === 'asc' ? 1 : -1, _id: -1 }, page, pageSize };
}
