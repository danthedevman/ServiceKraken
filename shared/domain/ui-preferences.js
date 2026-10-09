import { InputError } from '../validation/input-error.js';

export const DEFAULT_UI_PREFERENCES = Object.freeze({
  leftCollapsed: false,
  rightCollapsed: false,
  filtersOpen: false,
  tableLayouts: {},
  dashboardTab: 'incidents',
});

/** Store only bounded column identifiers, never row data or arbitrary user properties. */
function validTableLayouts(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length <= 100 &&
    Object.entries(value).every(
      ([key, layout]) =>
        /^[a-zA-Z0-9/_:-]{1,200}$/.test(key) &&
        !['__proto__', 'constructor', 'prototype'].includes(key) &&
        layout &&
        typeof layout === 'object' &&
        !Array.isArray(layout) &&
        Object.keys(layout).length === 2 &&
        ['order', 'hidden'].every(
          (property) =>
            Array.isArray(layout[property]) &&
            layout[property].length <= 100 &&
            new Set(layout[property]).size === layout[property].length &&
            layout[property].every(
              (column) => typeof column === 'string' && /^[a-zA-Z0-9_.:-]{1,100}$/.test(column),
            ),
        ),
    )
  );
}

/** Validate the small allowlist of supported preference values. */
function validPreference(key, value) {
  if (key === 'tableLayouts') return validTableLayouts(value);
  if (key === 'dashboardTab') return ['incidents', 'tasks', 'services'].includes(value);
  return typeof value === 'boolean';
}

/** Cache only non-sensitive, validated layout preferences for the first paint. */
export function uiPreferences(value) {
  return Object.fromEntries(
    Object.entries(DEFAULT_UI_PREFERENCES).map(([key, fallback]) => [
      key,
      validPreference(key, value?.[key]) ? value[key] : fallback,
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
      ([key, entry]) => !Object.hasOwn(DEFAULT_UI_PREFERENCES, key) || !validPreference(key, entry),
    )
  ) {
    throw new InputError('Choose a valid layout preference.');
  }
  return value;
}
