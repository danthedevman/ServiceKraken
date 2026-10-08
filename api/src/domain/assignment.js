import { identifier, invalid } from '@servicekraken/shared/validation/fields';

/** Resolve groups inside the workspace and prevent assigning a nonmember to grouped work. */
export async function assignmentGroup(db, workspaceId, groupId, assigneeId) {
  if (!groupId) return { assignmentGroupId: null, assignmentGroupName: '' };
  const assignmentGroupId = identifier(groupId, 'assignmentGroupId');
  const operations = await db.collection('operations').findOne({ _id: workspaceId });
  const group = operations?.groups?.find((row) => row.id === assignmentGroupId);
  if (!group) invalid('assignmentGroupId', 'Choose a group from this workspace.');
  if (assigneeId && !group.memberIds.includes(assigneeId))
    invalid('assigneeId', 'Choose a user in the selected assignment group.');
  return { assignmentGroupId, assignmentGroupName: group.name };
}
