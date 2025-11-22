
import React from 'react';
import styles from './PlaybackSpeedSelector.module.css';

interface Props {
  playbackRate: number;
  onRateChange: (rate: number) => void;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5];

const PlaybackSpeedSelector: React.FC<Props> = ({ playbackRate, onRateChange }) => {
  return (
    <div className={styles.wrapper} role="group" aria-labelledby="playback-speed-label">
      <span id="playback-speed-label" className={styles.label}>
        Snelheid Tutor
      </span>
      <div className={styles.buttons}>
        {PLAYBACK_RATES.map((rate) => {
          const buttonClassName =
            playbackRate === rate
              ? `${styles.button} ${styles.selectedButton}`
              : styles.button;

          return (
            <button
              key={rate}
              type="button"
              aria-pressed={playbackRate === rate}
              aria-label={`Stel tutorsnelheid in op ${rate}x`}
              onClick={() => onRateChange(rate)}
              className={buttonClassName}
            >
              {rate}x
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PlaybackSpeedSelector;