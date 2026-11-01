import { useCallback, useState } from 'react';

// The initial theme is resolved by the inline script in index.html.
export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem('theme', next);
      } catch {
        // Storage can be unavailable (private mode); the choice just won't persist.
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
