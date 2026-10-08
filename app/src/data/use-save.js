import { useState } from 'react';

import { writeApi } from './query-client.js';

/** Consistent mutation state and custom server validation for operations forms. */
export function useSave() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [fields, setFields] = useState({});
  const run = async (path, method, body, done) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setFields({});
    try {
      const { demoBatchId, ...editable } = body;
      const result = await writeApi(path, { method, body: editable });
      done?.(result);
    } catch (error) {
      setError(error.message);
      setFields(error.fields ?? {});
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, fields, run };
}
