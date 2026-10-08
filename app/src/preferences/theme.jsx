import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import React, { createContext, useContext, useLayoutEffect, useState } from 'react';

const ThemeContext = createContext(null);

/** Share appearance across routes without storing any account information.
 * @param {{children: React.ReactNode}} props
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#020617' : '#f7f9fa';
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#020617' : '#1d4ed8');
  }, [theme]);

  /** Persist an explicit preference; the toggle still works if storage is unavailable. */
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('servicekraken-theme', next);
    } catch {
      /* Keep this session's choice. */
    }
    setTheme(next);
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

/** Keyboard-accessible appearance switch available before and after sign-in. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return (
    <button
      type="button"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      onClick={toggleTheme}
      aria-label="Dark mode"
      aria-pressed={theme === 'dark'}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <MoonIcon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <SunIcon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
