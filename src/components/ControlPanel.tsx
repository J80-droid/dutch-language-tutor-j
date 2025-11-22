
import React, { useEffect, useRef, useState } from 'react';
import { MicIcon, StopIcon, EndSessionIcon } from './Icons';
import styles from './ControlPanel.module.css';

interface TalkStats {
  userShare: number;
  tutorShare: number;
  userWidth: number;
  tutorWidth: number;
  hasData: boolean;
  fallbackNotice: string | null;
}

interface TalkStatsSummary {
  userPercent: number;
  tutorPercent: number;
}

interface Props {
  isRecording: boolean;
  isSessionActive: boolean;
  isSessionReady?: boolean;
  onToggleRecording: () => void;
  onEndSession: () => void;
  talkStats: TalkStats;
  talkStatsSummary: TalkStatsSummary | null;
}

const ControlPanel: React.FC<Props> = ({
  isRecording,
  isSessionActive,
  isSessionReady = false,
  onToggleRecording,
  onEndSession,
  talkStats,
  talkStatsSummary,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      if (startTimeRef.current !== null) {
        const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(seconds);
      }
    };

    if (isRecording) {
      startTimeRef.current = Date.now();
      setElapsedSeconds(0);
      intervalRef.current = window.setInterval(tick, 1000);
    } else {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      startTimeRef.current = null;
      setElapsedSeconds(0);
    }

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRecording]);

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.statusRow}>
        {isSessionActive && isRecording ? (
          <div className={styles.recordingStatus}>
            <div className={styles.recordingIndicator}>
              <div className={styles.recordingPulse} />
            </div>
            <div className={styles.recordingTalkBar}>
              <div className={styles.recordingTalkBarContainer}>
                <span className={styles.recordingTalkSegmentUser} style={{ width: `${talkStats.userWidth}%` }} />
                <span className={styles.recordingTalkSegmentTutor} style={{ width: `${talkStats.tutorWidth}%` }} />
              </div>
              <div className={styles.recordingTalkLabels}>
                <span className={styles.recordingTalkLabelUser}>
                  Jij {talkStatsSummary ? `${talkStatsSummary.userPercent}%` : '0%'}
                </span>
                <span className={styles.recordingTalkLabelTutor}>
                  Tutor {talkStatsSummary ? `${talkStatsSummary.tutorPercent}%` : '0%'}
                </span>
              </div>
            </div>
            <span className={styles.recordingTimer}>{formatElapsed(elapsedSeconds)}</span>
          </div>
        ) : (
          <div className={styles.idleHint}>
            {isSessionActive ? 'Klik op Spreek om te beginnen' : 'Start een sessie om de bediening te gebruiken'}
          </div>
        )}
      </div>
      {isSessionActive && (
        <div className={styles.buttonRow}>
          <button
            type="button"
            onClick={onToggleRecording}
            className={`${styles.button} ${isRecording ? styles.stopButton : styles.startButton} ${isSessionReady && !isRecording ? styles.startButtonPulse : ''}`}
            title={isRecording ? 'Stop met Praten' : 'Begin met Praten'}
          >
            {isRecording ? <StopIcon /> : <MicIcon />}
            <span className={styles.buttonText}>{isRecording ? 'Stop' : 'Spreek'}</span>
          </button>
          <button
            type="button"
            onClick={onEndSession}
            className={`${styles.button} ${styles.endButton}`}
            title="Sessie Beëindigen"
          >
            <EndSessionIcon />
            <span className={styles.buttonText}>Beëindig Sessie</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;