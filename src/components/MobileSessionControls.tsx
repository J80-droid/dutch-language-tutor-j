import React from 'react';
import PlaybackSpeedSelector from './PlaybackSpeedSelector';
import styles from './MobileSessionControls.module.css';
import type { PendingCommand } from '@/app/state/session/types';

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

interface MobileSessionControlsProps {
    isOpen: boolean;
    onToggle: () => void;
    playbackRate: number;
    onRateChange: (rate: number) => void;
    onRequestFollowUp: () => void;
    onRequestNewTopic: () => void;
    onRequestGoalChange: () => void;
    onRequestGoalFeedback: () => void;
    commandPending: boolean;
    commandFeedback: string | null;
    talkStats: TalkStats;
    talkStatsSummary: TalkStatsSummary | null;
    isSessionActive: boolean;
    pendingCommand: PendingCommand;
    goalSelectionOpen: boolean;
    isRecording: boolean;
}

const MobileSessionControls: React.FC<MobileSessionControlsProps> = ({
    isOpen,
    onToggle,
    playbackRate,
    onRateChange,
    onRequestFollowUp,
    onRequestNewTopic,
    onRequestGoalChange,
    onRequestGoalFeedback,
    commandPending,
    commandFeedback,
    talkStats,
    talkStatsSummary,
    isSessionActive,
    pendingCommand,
    goalSelectionOpen,
    isRecording,
}) => {
    const disableCommands = !isSessionActive || commandPending || goalSelectionOpen;
    const shouldAnnounce = commandPending || Boolean(commandFeedback);
    const loaderMessage =
        pendingCommand === 'new-topic'
            ? 'Even geduld ajb, ik ben een nieuw onderwerp aan het bedenken...'
            : pendingCommand === 'goal-feedback'
                ? 'Even geduld ajb, ik stel jouw tussentijdse feedback samen...'
                : null;

    return (
        <>
            {isOpen && (
                <button
                    type="button"
                    className={styles.backdrop}
                    onClick={onToggle}
                    aria-label="Sluit bedieningspaneel"
                />
            )}
            <div
                className={styles.container}
                role="dialog"
                aria-modal={isOpen ? 'true' : undefined}
                aria-live={shouldAnnounce ? 'polite' : undefined}
            >
                <div className={`${styles.sheet} ${isOpen ? styles.sheetOpen : styles.sheetClosed}`}>
                    {isRecording && (
                        <div className={styles.recordingStatusBar}>
                            <div className={styles.recordingIndicator}>
                                <div className={styles.recordingPulse} />
                            </div>
                            <div className={styles.recordingTalkBarMini}>
                                <div className={styles.recordingTalkBarContainer}>
                                    <span className={styles.recordingTalkSegmentUser} style={{ width: `${talkStats.userWidth}%` }} />
                                    <span className={styles.recordingTalkSegmentTutor} style={{ width: `${talkStats.tutorWidth}%` }} />
                                </div>
                                <div className={styles.recordingTalkLabels}>
                                    <span>Jij {talkStatsSummary ? `${talkStatsSummary.userPercent}%` : '0%'}</span>
                                    <span>Tutor {talkStatsSummary ? `${talkStatsSummary.tutorPercent}%` : '0%'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        type="button"
                        className={styles.handle}
                        onClick={onToggle}
                        aria-expanded={isOpen}
                        aria-controls="mobile-session-controls"
                    >
                        <span className={styles.handleBar} />
                        <span className={styles.handleLabel}>Bediening</span>
                        <span className={styles.handleAction}>{isOpen ? 'Sluit' : 'Open'}</span>
                    </button>
                    <div
                        id="mobile-session-controls"
                        className={styles.content}
                        aria-hidden={!isOpen}
                    >
                        {loaderMessage && (
                            <div className={styles.topicProgress} role="status" aria-live="polite">
                                <span className={styles.topicProgressLabel}>{loaderMessage}</span>
                                <div className={styles.topicProgressBar}>
                                    <span className={styles.topicProgressFill} />
                                </div>
                            </div>
                        )}
                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={styles.actionButton}
                                onClick={onRequestFollowUp}
                                disabled={disableCommands}
                            >
                                Vraag door
                            </button>
                            <button
                                type="button"
                                className={styles.actionButton}
                                onClick={onRequestNewTopic}
                                disabled={disableCommands}
                            >
                                Nieuw onderwerp
                            </button>
                            <button
                                type="button"
                                className={styles.actionButton}
                                onClick={onRequestGoalFeedback}
                                disabled={disableCommands}
                            >
                                Tussentijdse feedback
                            </button>
                            <button
                                type="button"
                                className={styles.actionButton}
                                onClick={onRequestGoalChange}
                                disabled={disableCommands}
                            >
                                Leerdoel wijzigen
                            </button>
                        </div>
                        {commandFeedback && <div className={styles.feedback}>{commandFeedback}</div>}
                        {talkStats.hasData && (
                            <div className={styles.talkCard}>
                                <div className={styles.talkHeader}>Spreektijd</div>
                                <div className={styles.talkBar}>
                                    <span className={styles.talkSegmentUser} style={{ width: `${talkStats.userWidth}%` }} />
                                    <span className={styles.talkSegmentTutor} style={{ width: `${talkStats.tutorWidth}%` }} />
                                </div>
                                {talkStatsSummary ? (
                                    <div className={styles.talkLegend}>
                                        <span>Jij {talkStatsSummary.userPercent}%</span>
                                        <span>Tutor {talkStatsSummary.tutorPercent}%</span>
                                    </div>
                                ) : (
                                    <div className={styles.talkLegend}>Nog geen spreektijd beschikbaar</div>
                                )}
                            </div>
                        )}
                        <div className={styles.playbackCard}>
                            <div className={styles.playbackLabel}>
                                Tutor snelheid: {playbackRate.toFixed(2).replace(/\.00$/, '')}x
                            </div>
                            <PlaybackSpeedSelector playbackRate={playbackRate} onRateChange={onRateChange} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileSessionControls;

