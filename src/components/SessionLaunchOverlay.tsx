import React, { useEffect, useState } from 'react';
import styles from './SessionLaunchOverlay.module.css';

interface Props {
  active: boolean;
  progress: number;
  label: string;
  sublabel?: string | null;
  error?: string | null;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getPhaseInfo = (progress: number): { phase: number; phaseLabel: string } => {
  if (progress < 0.25) {
    return { phase: 1, phaseLabel: 'Verbinden met tutor...' };
  } else if (progress < 0.5) {
    return { phase: 2, phaseLabel: 'Onderwerp voorbereiden...' };
  } else if (progress < 0.75) {
    return { phase: 3, phaseLabel: 'Sessie configureren...' };
  } else {
    return { phase: 4, phaseLabel: 'Klaar! Tutor begint nu...' };
  }
};

export const SessionLaunchOverlay: React.FC<Props> = ({ active, progress, label, sublabel, error }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (active) {
      setIsVisible(true);
      setIsExiting(false);
    } else if (isVisible && progress >= 1.0) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [active, progress, isVisible]);

  if (!isVisible) {
    return null;
  }

  const pct = Math.round(clamp(progress, 0, 1) * 100);
  const { phase, phaseLabel } = getPhaseInfo(progress);
  const displayLabel = label || phaseLabel;

  return (
    <div 
      className={`${styles.overlay} ${isExiting ? styles.overlayExiting : ''}`} 
      role="status" 
      aria-live="polite" 
      aria-busy="true"
    >
      <div className={`${styles.card} ${isExiting ? styles.cardExiting : ''}`}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.headline}>
          <div className={styles.progressRing} style={{ '--pct': clamp(progress, 0, 1) } as React.CSSProperties} aria-hidden="true" />
          <div className={styles.labelBlock}>
            <span className={styles.title}>{displayLabel}</span>
            {sublabel && <span className={styles.subtitle}>{sublabel}</span>}
          </div>
          <span className={styles.percentMajor}>{pct}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} style={{ '--pct': clamp(progress, 0, 1) } as React.CSSProperties} />
        </div>
        <div className={styles.statusFooter}>
          <span>Vooruitgang</span>
          <span>Fase {phase}/4</span>
        </div>
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionLaunchOverlay;

