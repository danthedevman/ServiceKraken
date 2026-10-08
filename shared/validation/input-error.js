/** An expected client error that can safely be shown in the interface. */
export class InputError extends Error {
  /** @param {string} message @param {number} [status] */
  constructor(message, status = 400, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
