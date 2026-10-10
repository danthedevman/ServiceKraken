import { useUiPreferences } from './ui-preferences.jsx';
import React, { useContext } from 'react';
import { AuthContext } from '../auth/auth-context.js';
import { dateTime } from '../lib/date-time.js';

/** Reactively apply the signed-in viewer's saved zone; anonymous visitors use their browser zone. */
export function useDateTime() {
  const { user } = useContext(AuthContext);
  const preferences = useUiPreferences();
  return (value) => dateTime(value, user?.timeZone, preferences ?? user?.uiPreferences ?? {});
}

/** Render a localized instant while retaining its machine-readable UTC value. */
export function DateTime({ value }) {
  const format = useDateTime();
  const date = value ? new Date(value) : null;
  return (
    <time dateTime={date && !Number.isNaN(+date) ? date.toISOString() : undefined}>
      {format(value)}
    </time>
  );
}
