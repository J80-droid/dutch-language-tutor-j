
import React from 'react';

interface Props {
  playbackRate: number;
  onRateChange: (rate: number) => void;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5];

const PlaybackSpeedSelector: React.FC<Props> = ({ playbackRate, onRateChange }) => {
  return (
    <div>
      <label htmlFor="playback-speed" style={styles.label}>Snelheid Tutor</label>
      <div style={styles.container}>
        {PLAYBACK_RATES.map((rate) => (
          <button
            key={rate}
            onClick={() => onRateChange(rate)}
            style={{
              ...styles.button,
              ...(playbackRate === rate ? styles.selectedButton : {}),
            }}
          >
            {rate}x
          </button>
        ))}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  label: { display: 'block', marginBottom: '8px', fontSize: '0.9em', fontWeight: 'bold', textAlign: 'center' },
  container: { display: 'flex', gap: '8px' },
  button: {
    padding: '8px 12px',
    fontSize: '0.9em',
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-secondary)',
    color: 'var(--color-text)',
    minWidth: '50px',
  },
  selectedButton: {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-primary-text)',
    borderColor: 'var(--color-primary)',
  },
};

export default PlaybackSpeedSelector;