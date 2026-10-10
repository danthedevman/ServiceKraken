import { invalid } from '../validation/fields.js';

/** Fixed-width hexadecimal ranks leave large gaps between legacy ObjectId-based positions. */
export function taskRank(task) {
  return task.boardRank ?? String(task._id ?? task.id).padEnd(64, '0');
}
export function rankBetween(before, after) {
  const low = before ? BigInt(`0x${before}`) : 0n;
  const high = after ? BigInt(`0x${after}`) : (1n << 256n) - 1n;
  if (high - low < 2n)
    invalid(
      'boardPosition',
      'These tasks are being reordered concurrently. Refresh the board and try another position.',
    );
  return ((low + high) / 2n).toString(16).padStart(64, '0');
}
export function boardRankStage() {
  return {
    $addFields: {
      boardRank: {
        $ifNull: [
          '$boardRank',
          { $concat: [{ $convert: { input: '$_id', to: 'string' } }, '0'.repeat(40)] },
        ],
      },
    },
  };
}

/** Legacy records without an option ID belong to their canonical status lane. */
export function taskLaneFilter(option, status) {
  return option === status
    ? { $or: [{ statusOption: option }, { statusOption: null, status }] }
    : { statusOption: option };
}
