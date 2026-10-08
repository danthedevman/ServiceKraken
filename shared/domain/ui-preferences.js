import { InputError } from '../validation/input-error.js';

export const DEFAULT_UI_PREFERENCES = Object.freeze({
  leftCollapsed: false,
  rightCollapsed: false,
});

/** Only layout booleans may enter preferences or the browser's first-paint cache. */
export function uiPreferences(value) {
  return Object.fromEntries(
    Object.entries(DEFAULT_UI_PREFERENCES).map(([key, fallback]) => [
      key,
      typeof value?.[key] === 'boolean' ? value[key] : fallback,
    ]),
  );
}

/** Validate partial updates without allowing arbitrary user-document fields. */
export function preferencePatch(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !Object.keys(value).length ||
    Object.entries(value).some(
      ([key, entry]) => !Object.hasOwn(DEFAULT_UI_PREFERENCES, key) || typeof entry !== 'boolean',
    )
  ) {
    throw new InputError('Choose a valid sidebar preference.');
  }
  return value;
}
