/** Read a bounded positive integer so invalid tuning cannot overload the worker. */
export function positiveSetting(name, fallback, maximum, minimum = 1) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  if (!/^\d+$/.test(raw) || Number(raw) < minimum || Number(raw) > maximum)
    throw new Error(`${name} must be a whole number between ${minimum} and ${maximum}.`);
  return Number(raw);
}
