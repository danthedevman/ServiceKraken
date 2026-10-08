/** Human-readable labels for built-in enums; stored/API values remain unchanged. */
export function displayValue(value) {
  const labels = {
    in_progress: 'In progress',
    todo: 'To do',
    servicenow: 'ServiceNow',
    email: 'Email',
    slack: 'Slack',
    teams: 'Teams',
    textarea: 'Long text',
    checkbox: 'Checkbox',
    builtin: 'Built-in',
    up: 'Operational',
    down: 'Down',
    sent: 'Sent',
    skipped: 'Skipped',
  };
  if (value == null || value === '') return '—';
  const text = String(value);
  return labels[text] ?? text.replaceAll('_', ' ').replace(/^./, (first) => first.toUpperCase());
}
