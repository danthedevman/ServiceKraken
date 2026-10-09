import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { AuthContext } from '../auth/auth-context.js';
import { api } from '../data/api.js';
import { uiPreferences, preferencePatch } from '../../../shared/domain/ui-preferences.js';

const PreferencesContext = createContext(null);
const previewKey = 'servicekraken-layout';
const accountKey = (id) => `servicekraken-layout:${id}`;
/** Cache only non-sensitive layout preferences; blocked storage falls back to memory. */
function read(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? uiPreferences(JSON.parse(value)) : null;
  } catch {
    return null;
  }
}
function pending(key) {
  try {
    return JSON.parse(localStorage.getItem(key))?.pending === true;
  } catch {
    return false;
  }
}
function persist(key, values, pending = false) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...uiPreferences(values), pending }));
  } catch {
    /* Layout still works without browser storage. */
  }
}
function initialLayout() {
  const cached = read(previewKey);
  if (cached) return cached;
  try {
    return uiPreferences({
      leftCollapsed: localStorage.getItem('servicekraken-sidebar') === 'collapsed',
    });
  } catch {
    return uiPreferences();
  }
}

/** Restore layout before paint and serialize authenticated preference writes to preserve toggle order. */
export function PreferencesProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [values, setValues] = useState(initialLayout),
    [error, setError] = useState('');
  const current = useRef(values),
    identity = useRef(user?.id),
    queue = useRef(Promise.resolve());
  const controller = useRef(null);
  identity.current = user?.id;
  useLayoutEffect(() => {
    controller.current?.abort();
    controller.current = new AbortController();
    if (!user) return;
    const unsynced = pending(accountKey(user.id));
    const next = unsynced
      ? read(accountKey(user.id)) || initialLayout()
      : user.uiPreferences
        ? uiPreferences(user.uiPreferences)
        : read(accountKey(user.id)) || initialLayout();
    current.current = next;
    setValues(next);
    setError('');
    persist(accountKey(user.id), next, unsynced);
    persist(previewKey, next);
    return () => controller.current?.abort();
  }, [user?.id]);
  useEffect(() => {
    const sync = (event) => {
      if (user && event.key === accountKey(user.id)) {
        const next = read(event.key);
        if (next) {
          current.current = next;
          setValues(next);
          persist(previewKey, next);
        }
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [user?.id]);
  function setPreference(key, value) {
    if (!user) return;
    try {
      preferencePatch({ [key]: value });
    } catch {
      return;
    }
    const next = { ...current.current, [key]: value },
      account = user.id,
      signal = controller.current.signal;
    current.current = next;
    setValues(next);
    setError('');
    persist(accountKey(account), next, true);
    persist(previewKey, next);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (identity.current !== account || signal.aborted) return;
        try {
          await api('/auth/preferences', { method: 'PATCH', body: next, signal });
          if (identity.current !== account || signal.aborted) return;
          if (Object.keys(next).every((key) => current.current[key] === next[key])) {
            persist(accountKey(account), next);
            setError('');
          }
        } catch (failure) {
          if (!signal.aborted && identity.current === account)
            setError(
              'Layout saved in this browser, but account sync failed. Toggle again to retry.',
            );
        }
      });
  }
  /** Update one view using the latest preferences so rapid changes do not overwrite other tables. */
  function setTableLayout(key, update) {
    const layouts = { ...current.current.tableLayouts };
    if (update === null) delete layouts[key];
    else
      layouts[key] =
        typeof update === 'function' ? update(layouts[key] ?? { order: [], hidden: [] }) : update;
    setPreference('tableLayouts', layouts);
  }
  return (
    <PreferencesContext.Provider value={{ ...values, setPreference, setTableLayout, error }}>
      {children}
    </PreferencesContext.Provider>
  );
}

/** Consume shared preferences without remounting record forms when the layout changes. */
export function useUiPreferences() {
  return useContext(PreferencesContext);
}
