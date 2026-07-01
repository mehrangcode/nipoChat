import { create } from 'zustand';

type Theme = 'light' | 'dark';
const KEY = 'nipo.theme';

function initial(): Theme {
  const saved = localStorage.getItem(KEY) as Theme | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f0e1a' : '#4f46e5');
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial(),
  toggle: () => get().set(get().theme === 'dark' ? 'light' : 'dark'),
  set: (theme) => {
    localStorage.setItem(KEY, theme);
    apply(theme);
    set({ theme });
  },
}));

// Apply on module load.
apply(useThemeStore.getState().theme);
