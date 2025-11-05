
import React from 'react';
import { MicIcon, StopIcon, EndSessionIcon } from './Icons';

interface Props {
  isRecording: boolean;
  isSessionActive: boolean;
  onToggleRecording: () => void;
  onEndSession: () => void;
}

const ControlPanel: React.FC<Props> = ({
  isRecording,
  isSessionActive,
  onToggleRecording,
  onEndSession,
}) => {
  return (
    <div style={styles.container}>
      {isSessionActive && (
        <button
          onClick={onToggleRecording}
          style={{ ...styles.button, ...(isRecording ? styles.stopButton : styles.startButton) }}
          title={isRecording ? 'Stop met Praten' : 'Begin met Praten'}
        >
          {isRecording ? <StopIcon /> : <MicIcon />}
          <span style={styles.buttonText}>{isRecording ? 'Stop' : 'Spreek'}</span>
        </button>
      )}
      {isSessionActive && (
         <button onClick={onEndSession} style={{...styles.button, ...styles.endButton}} title="Sessie Beëindigen">
             <EndSessionIcon />
             <span style={styles.buttonText}>Beëindig Sessie</span>
         </button>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    padding: '20px',
    borderTop: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-secondary-bg)',
    flexShrink: 0,
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '15px 25px',
    fontSize: '1em',
    fontWeight: 'bold',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '50px',
    color: 'var(--color-primary-text)',
    transition: 'background-color 0.2s, transform 0.1s',
  },
  buttonText: {
    display: 'block',
  },
  startButton: {
    backgroundColor: 'var(--color-primary)',
  },
  stopButton: {
    backgroundColor: '#d93025', // A red color for stop
  },
  endButton: {
      backgroundColor: '#5f6368'
  }
};

export default ControlPanel;