/** Regional defaults retain IANA rules, so daylight-saving offsets follow the date being displayed. */
const commonZones = [
  ['UTC', 'UTC — Coordinated Universal Time'],
  ['Pacific/Honolulu', 'Hawaii — Honolulu'],
  ['America/Anchorage', 'Alaska — Anchorage'],
  ['America/Los_Angeles', 'US / Canada Pacific — Los Angeles'],
  ['America/Denver', 'US / Canada Mountain — Denver'],
  ['America/Phoenix', 'Arizona — Phoenix'],
  ['America/Chicago', 'US / Canada Central — Chicago'],
  ['America/New_York', 'US / Canada Eastern — New York'],
  ['America/Halifax', 'Canada Atlantic — Halifax'],
  ['America/St_Johns', 'Newfoundland — St. John’s'],
  ['America/Mexico_City', 'Mexico — Mexico City'],
  ['America/Bogota', 'Colombia / Peru — Bogotá'],
  ['America/Sao_Paulo', 'Brazil — São Paulo'],
  ['America/Argentina/Buenos_Aires', 'Argentina — Buenos Aires'],
  ['Europe/London', 'UK / Ireland — London'],
  ['Europe/Paris', 'Central Europe — Paris'],
  ['Europe/Helsinki', 'Eastern Europe — Helsinki'],
  ['Europe/Istanbul', 'Türkiye — Istanbul'],
  ['Africa/Lagos', 'West Africa — Lagos'],
  ['Africa/Johannesburg', 'South Africa — Johannesburg'],
  ['Africa/Nairobi', 'East Africa — Nairobi'],
  ['Asia/Dubai', 'Gulf — Dubai'],
  ['Asia/Kolkata', 'India — Kolkata'],
  ['Asia/Kathmandu', 'Nepal — Kathmandu'],
  ['Asia/Dhaka', 'Bangladesh — Dhaka'],
  ['Asia/Bangkok', 'Thailand / Vietnam — Bangkok'],
  ['Asia/Singapore', 'Singapore / Malaysia — Singapore'],
  ['Asia/Shanghai', 'China — Shanghai'],
  ['Asia/Tokyo', 'Japan — Tokyo'],
  ['Asia/Seoul', 'South Korea — Seoul'],
  ['Australia/Perth', 'Western Australia — Perth'],
  ['Australia/Adelaide', 'South Australia — Adelaide'],
  ['Australia/Brisbane', 'Queensland — Brisbane'],
  ['Australia/Sydney', 'Eastern Australia — Sydney'],
  ['Pacific/Auckland', 'New Zealand — Auckland'],
];

/** Offer a bounded regional list without dropping a previously saved valid timezone or alias. */
export function timeZoneOptions(current = '') {
  const options = commonZones.map(([value, label]) => ({ value, label }));
  if (current && !options.some((option) => option.value === current))
    options.push({
      value: current,
      label: `${current.replaceAll('_', ' ').replaceAll('/', ' / ')} — Saved time zone`,
    });
  return options;
}
