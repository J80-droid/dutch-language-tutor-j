
import React from 'react';
import { Theme } from '../types';
import { PaletteIcon } from './Icons';

interface Props {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes?: Theme[];
}

const ThemeSelector: React.FC<Props> = ({ theme, setTheme, availableThemes }) => {
  const themes = availableThemes && availableThemes.length > 0 ? availableThemes : undefined;
  const activeThemes = themes ?? [theme];

  const cycleTheme = () => {
    if (activeThemes.length <= 1) {
      return;
    }
    const currentIndex = activeThemes.indexOf(theme);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % activeThemes.length : 0;
    setTheme(activeThemes[nextIndex]);
  };

  const isDisabled = activeThemes.length <= 1;

  return (
    <button
      onClick={cycleTheme}
      style={{
        ...styles.button,
        ...(isDisabled ? styles.buttonDisabled : {}),
      }}
      title={isDisabled ? 'Ontgrendel meer thema’s door je level te verhogen.' : 'Verander thema'}
      disabled={isDisabled}
    >
      <PaletteIcon />
    </button>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  button: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text)',
    padding: '5px',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

export default ThemeSelector;