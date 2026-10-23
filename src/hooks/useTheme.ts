import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'sql-run.theme';
const SYSTEM_QUERY = '(prefers-color-scheme: dark)';

function readPreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return {
      theme: saved === 'light' || saved === 'dark' ? saved : null,
      storageError: false,
    };
  } catch {
    return { theme: null, storageError: true };
  }
}

export function useTheme() {
  const [preference, setPreference] = useState(readPreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(SYSTEM_QUERY).matches);
  const theme: Theme = preference.theme === 'light' || preference.theme === 'dark'
    ? preference.theme
    : systemDark ? 'dark' : 'light';

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_QUERY);
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content', theme === 'dark' ? '#0a0a0a' : '#f5f5f5',
    );
  }, [theme]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(STORAGE_KEY, next);
      setPreference({ theme: next, storageError: false });
    } catch {
      setPreference({ theme: next, storageError: true });
    }
  }

  return { theme, toggleTheme, storageError: preference.storageError };
}
