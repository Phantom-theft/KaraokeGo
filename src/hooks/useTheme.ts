import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';

const STORAGE_KEY = 'karaokego_theme';

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* ignore */
  }
  return 'system';
}

function resolveTheme(preference: ThemePreference): Theme {
  return preference === 'system' ? getSystemTheme() : preference;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

/** Keep DOM theme in sync with preference + system changes. */
let preference: ThemePreference = typeof window !== 'undefined' ? readPreference() : 'system';
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setPreference(next: ThemePreference) {
  preference = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  applyTheme(resolveTheme(next));
  emit();
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function runThemeTransition(update: () => void) {
  if (prefersReducedMotion()) {
    update();
    return;
  }

  const root = document.documentElement;
  root.classList.add('theme-switching');
  // Double rAF so the browser applies transition styles before token changes
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      update();
      window.setTimeout(() => {
        root.classList.remove('theme-switching');
      }, 850);
    });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ThemePreference {
  return preference;
}

function getServerSnapshot(): ThemePreference {
  return 'system';
}

// Apply once on module load (client)
if (typeof window !== 'undefined') {
  applyTheme(resolveTheme(preference));

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => {
    if (preference === 'system') {
      applyTheme(getSystemTheme());
      emit();
    }
  };
  mq.addEventListener?.('change', onSystemChange);
}

export function useTheme() {
  const pref = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(pref));

  useEffect(() => {
    setTheme(resolveTheme(pref));
  }, [pref]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (pref === 'system') setTheme(getSystemTheme());
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  const setThemePreference = useCallback((next: ThemePreference) => {
    setPreference(next);
  }, []);

  const toggleTheme = useCallback(() => {
    const current = resolveTheme(preference);
    const next = current === 'dark' ? 'light' : 'dark';
    runThemeTransition(() => setPreference(next));
  }, []);

  return {
    theme,
    preference: pref,
    setThemePreference,
    toggleTheme,
    isDark: theme === 'dark',
  };
}
