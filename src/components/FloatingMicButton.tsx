import React from 'react';
import { MicIcon, StopIcon } from './Icons';
import styles from './FloatingMicButton.module.css';

interface FloatingMicButtonProps {
    isRecording: boolean;
    isSessionActive: boolean;
    isSessionReady?: boolean;
    onToggle: () => void;
    sheetOpen?: boolean;
}

const FloatingMicButton: React.FC<FloatingMicButtonProps> = ({
    isRecording,
    isSessionActive,
    isSessionReady = false,
    onToggle,
    sheetOpen = false,
}) => {
    const label = isRecording ? 'Stop opname' : 'Begin met spreken';

    return (
        <button
            type="button"
            className={[
                styles.button,
                isRecording ? styles.buttonRecording : '',
                sheetOpen ? styles.buttonRaised : '',
                isSessionReady && !isRecording ? styles.buttonPulse : '',
            ]
                .filter(Boolean)
                .join(' ')}
            onClick={onToggle}
            disabled={!isSessionActive}
            aria-pressed={isRecording}
            aria-label={label}
        >
            <span className={styles.icon}>{isRecording ? <StopIcon /> : <MicIcon />}</span>
            <span className={styles.label}>{isRecording ? 'Stop' : 'Spreek'}</span>
        </button>
    );
};

export default FloatingMicButton;

