/** Format one plain-text field and indent continuation lines so they remain part of its value. */
function field(label, value) {
  const text = String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .trim();
  return `${label}: ${text ? text.replaceAll('\n', '\n  ') : 'Not provided'}`;
}

/** Build a labeled, allowlisted message shared by every notification provider. */
export function message(incident, event, delivery = {}) {
  const severity = String(incident.severity ?? '')
    .replaceAll('_', ' ')
    .replace(/^./, (first) => first.toUpperCase());
  const fields = [
    [
      'Event',
      { impacted: 'Impacted', recovered: 'Recovered', comment: 'New comment' }[event] ??
        'Incident update',
    ],
    ['Title', incident.title],
    ['Service', incident.serviceName],
    ['Severity', severity],
    ['Incident', incident._id],
    ['Description', incident.description],
  ];
  if (event === 'comment') {
    fields.push(['Comment author', delivery.commentAuthor], ['Comment', delivery.commentBody]);
  }
  return fields.map(([label, value]) => field(label, value)).join('\n');
}
