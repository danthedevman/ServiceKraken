import { InputError } from '../validation/input-error.js';

export const STATUS_MESSAGE_LEVELS = ['info', 'maintenance', 'warning', 'critical'];

/** Validate bounded plain-text announcements; callers validate service ownership separately. */
export function statusMessage(value, field = 'banner') {
  const errors = {};
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new InputError('Enter a valid status message.', 400, { [field]: 'Invalid message.' });
  if (typeof value.enabled !== 'boolean') errors[field] = 'Choose whether to display this message.';
  if (!STATUS_MESSAGE_LEVELS.includes(value.level)) errors[field] = 'Choose a valid criticality.';
  if (typeof value.text !== 'string' || value.text.trim().length > 1000)
    errors[field] = 'Use at most 1,000 characters.';
  else if (value.enabled && !value.text.trim()) errors[field] = 'Message is required when enabled.';
  if (Object.keys(errors).length) throw new InputError(Object.values(errors)[0], 400, errors);
  return { enabled: value.enabled, level: value.level, text: value.text.trim() };
}
