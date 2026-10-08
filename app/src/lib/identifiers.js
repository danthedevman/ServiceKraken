/** Random IDs without dependencies, used only for embedded UI-created records. */
export function newId() {
  return [...crypto.getRandomValues(new Uint8Array(12))]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}
