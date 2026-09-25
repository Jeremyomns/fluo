import { useCallback, useState } from 'react';

export type Theme = 'light' | 'dark';
const THEME_COLORS: Record<Theme, string> = { light: '#DCE1F3', dark: '#0F1013' };

function currentTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  try {
    localStorage.setItem('theme', theme); // préférence propre à chaque appareil
  } catch {
    /* navigation privée : on ignore */
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  }, [theme]);
  return { theme, toggle };
}
