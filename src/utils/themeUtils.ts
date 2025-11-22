import { Theme, THEMES } from '../types';

export const THEME_UNLOCK_LEVEL: Record<Theme, number> = {
  sky: 1,
  rose: 2,
  emerald: 3,
  violet: 4,
  amber: 5,
};

export const getUnlockedThemes = (level: number): Theme[] => {
  return THEMES.filter(theme => level >= (THEME_UNLOCK_LEVEL[theme] ?? Number.MAX_SAFE_INTEGER));
};

export const getNextThemeUnlock = (level: number): { theme: Theme; requiredLevel: number } | null => {
  const lockedThemes = THEMES.filter(theme => level < (THEME_UNLOCK_LEVEL[theme] ?? Number.MAX_SAFE_INTEGER));
  if (!lockedThemes.length) {
    return null;
  }
  const nextTheme = lockedThemes.sort(
    (a, b) => (THEME_UNLOCK_LEVEL[a] ?? Infinity) - (THEME_UNLOCK_LEVEL[b] ?? Infinity),
  )[0];
  return {
    theme: nextTheme,
    requiredLevel: THEME_UNLOCK_LEVEL[nextTheme],
  };
};

export const applyTheme = (theme: Theme) => {
  const root = window.document.documentElement;
  root.dataset.theme = theme;
  localStorage.setItem('theme', theme);
};

export const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedPrefs = window.localStorage.getItem('theme');
    if (THEMES.includes(storedPrefs as Theme)) {
      return storedPrefs as Theme;
    }
  }
  // Default to the first theme in the list
  return THEMES[0];
};