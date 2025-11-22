
import React from 'react';
import { CEFRLevel } from '../types';
import styles from './LevelSelector.module.css';
import { LEVEL_THEMES } from './levelThemes';

interface Props {
  levels: readonly CEFRLevel[];
  selectedLevel: CEFRLevel;
  onSelectLevel: (level: CEFRLevel) => void;
}

const LevelSelector: React.FC<Props> = ({ levels, selectedLevel, onSelectLevel }) => {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.label}>Vaardigheidsniveau (CEFR)</h3>
      <div className={styles.container}>
        {levels.map((level) => {
          const theme = LEVEL_THEMES[level];
          const baseStyle: React.CSSProperties = {
            ...(theme?.card ?? {}),
          };
          const selectedOverrides: React.CSSProperties =
            selectedLevel === level
              ? {
                  ...(theme?.cardSelected ?? {}),
                  ...(theme?.barGradient ? { background: theme.barGradient } : {}),
                }
              : {};

          return (
            <button
              key={level}
              onClick={() => onSelectLevel(level)}
              className={`${styles.buttonBase} ${styles.button} ${selectedLevel === level ? styles.selected : ''}`}
              style={{ ...baseStyle, ...selectedOverrides }}
            >
              {level}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LevelSelector;