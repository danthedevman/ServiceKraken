import { id } from '../routes/services.js';
import { InputError } from '@servicetrident/shared/validation/validation';
import {
  boardRankStage,
  rankBetween,
  taskRank,
  taskLaneFilter,
} from '../../../shared/domain/task-board.js';

/** Find the immediate persisted neighbor, including cards outside the current filtered page. */
export async function positionTask(collection, workspaceId, current, status, option, position) {
  if (
    !position ||
    typeof position !== 'object' ||
    Array.isArray(position) ||
    Object.keys(position).some((key) => !['targetId', 'side'].includes(key)) ||
    !['before', 'after'].includes(position.side)
  )
    throw new InputError('Choose a task and a position before or after it.');
  const target = await collection.findOne({ _id: id(position.targetId), workspaceId });
  if (
    !target ||
    String(target._id) === String(current._id) ||
    target.status !== status ||
    (target.statusOption ?? target.status) !== option ||
    status === 'archived'
  )
    throw new InputError('The target task changed or is unavailable. Refresh the board.', 409);
  const rank = taskRank(target);
  const before = position.side === 'before';
  const [neighbor] = await collection
    .aggregate([
      {
        $match: {
          workspaceId,
          status,
          ...taskLaneFilter(option, status),
          _id: { $nin: [current._id, target._id] },
        },
      },
      boardRankStage(),
      { $match: { boardRank: { [before ? '$lt' : '$gt']: rank } } },
      { $sort: { boardRank: before ? -1 : 1, _id: 1 } },
      { $limit: 1 },
    ])
    .toArray();
  return before
    ? rankBetween(neighbor && taskRank(neighbor), rank)
    : rankBetween(rank, neighbor && taskRank(neighbor));
}
