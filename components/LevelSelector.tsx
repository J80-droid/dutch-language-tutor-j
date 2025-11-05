
import React from 'react';
import { CEFRLevel } from '../types';

interface Props {
  levels: readonly CEFRLevel[];
  selectedLevel: CEFRLevel;
  onSelectLevel: (level: CEFRLevel) => void;
}

const LevelSelector: React.FC<Props> = ({ levels, selectedLevel, onSelectLevel }) => {
  return (
    <div>
      <h3 style={styles.label}>Vaardigheidsniveau (CEFR)</h3>
      <div style={styles.container}>
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => onSelectLevel(level)}
            style={{
              ...styles.button,
              ...(selectedLevel === level ? styles.selectedButton : {}),
            }}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  label: { margin: '0 0 10px 0', fontSize: '1em' },
  container: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  button: {
    padding: '10px 15px',
    fontSize: '1em',
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-secondary)',
    color: 'var(--color-text)',
  },
  selectedButton: {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-primary-text)',
    borderColor: 'var(--color-primary)',
  },
};

export default LevelSelector;