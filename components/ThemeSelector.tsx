
import React from 'react';
import { Theme, THEMES } from '../types';
import { PaletteIcon } from './Icons';

interface Props {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeSelector: React.FC<Props> = ({ theme, setTheme }) => {
  const cycleTheme = () => {
    const currentIndex = THEMES.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    setTheme(THEMES[nextIndex]);
  };

  return (
    <button onClick={cycleTheme} style={styles.button} title="Verander Thema">
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
};

export default ThemeSelector;