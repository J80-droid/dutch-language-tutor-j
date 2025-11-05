import { Theme, THEMES } from '../types';

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