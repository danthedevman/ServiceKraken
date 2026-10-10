import React from 'react';
import { useUiPreferences } from './ui-preferences.jsx';
import { DateTime } from './date-time.jsx';
import { Select } from '../components/forms/select.jsx';

export function DateTimeSettings() {
  const preferences = useUiPreferences();
  return (
    <section className="space-y-4" aria-labelledby="date-time-settings-title">
      <h2 id="date-time-settings-title" className="text-lg font-semibold">
        Date and Time Format
      </h2>
      <label className="field-label block">
        Time Format
        <Select
          aria-label="Time Format"
          value={preferences.timeFormat}
          onChange={(event) => preferences.setPreference('timeFormat', event.target.value)}
        >
          <option value="locale">Browser Default</option>
          <option value="12">12-Hour (AM/PM)</option>
          <option value="24">24-Hour</option>
        </Select>
      </label>
      <label className="field-label block">
        Date Format
        <Select
          aria-label="Date Format"
          value={preferences.dateFormat}
          onChange={(event) => preferences.setPreference('dateFormat', event.target.value)}
        >
          <option value="locale">Browser Default</option>
          <option value="iso">YYYY-MM-DD</option>
          <option value="dmy">DD/MM/YYYY</option>
          <option value="mdy">MM/DD/YYYY</option>
          <option value="long">Long Date</option>
        </Select>
      </label>
      <p className="text-sm text-slate-500">
        Preview: <DateTime value="2026-10-10T17:05:06Z" />
      </p>
      <p className="text-sm text-slate-500">
        Uses your saved time zone for personal timestamps. UTC schedules, date filters, and CSV
        exports keep their defined formats.
      </p>
      {preferences.error && <p role="alert">{preferences.error}</p>}
    </section>
  );
}
