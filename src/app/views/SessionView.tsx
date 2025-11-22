import React, { useEffect, useMemo, useState } from 'react';
import styles from '../styles/AppShell.module.css';
import ConversationView from '@/components/ConversationView';
import PlaybackSpeedSelector from '@/components/PlaybackSpeedSelector';
import MobileSessionControls from '@/components/MobileSessionControls';
import FloatingMicButton from '@/components/FloatingMicButton';
import GoalSelectionModal from '@/components/GoalSelectionModal';
import { useSessionState } from '../providers/SessionProvider';

const MOBILE_QUERY = '(max-width: 768px)';

export const SessionView: React.FC = () => {
    const {
        transcripts,
        handleWordSelect,
        handleRequestFollowUp,
        handleRequestNewTopic,
        handleRequestGoalChange,
        handleRequestGoalFeedback,
        commandFeedback,
        commandPending,
        pendingCommand,
        talkStats,
        playbackRate,
        setPlaybackRate,
        isRecording,
        isSessionActive,
        isSessionReady,
        toggleRecording,
        goalSelectionState,
        updatePendingGoals,
        confirmGoalSelection,
        cancelGoalSelection,
    } = useSessionState();

    const [isMobile, setIsMobile] = useState<boolean>(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return true;
        }
        return window.matchMedia(MOBILE_QUERY).matches;
    });
    const [isControlsOpen, setIsControlsOpen] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }

        const mediaQuery = window.matchMedia(MOBILE_QUERY);
        const updateMatch = (event: MediaQueryListEvent | MediaQueryList) => {
            setIsMobile(event.matches);
        };

        updateMatch(mediaQuery);

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', updateMatch);
            return () => mediaQuery.removeEventListener('change', updateMatch);
        }
        if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(updateMatch);
            return () => mediaQuery.removeListener(updateMatch);
        }
        return () => undefined;
    }, []);

    useEffect(() => {
        if (!isMobile) {
            setIsControlsOpen(false);
        }
    }, [isMobile]);

    useEffect(() => {
        if (isMobile && commandFeedback) {
            setIsControlsOpen(true);
        }
    }, [commandFeedback, isMobile]);

    const handleToggleControls = () => {
        setIsControlsOpen(prev => !prev);
    };

    const talkStatsSummary = useMemo(() => {
        if (!talkStats.hasData) {
            return null;
        }
        return {
            userPercent: Math.round(talkStats.userShare * 100),
            tutorPercent: Math.round(talkStats.tutorShare * 100),
        };
    }, [talkStats]);

    const commandsDisabled = commandPending || goalSelectionState.open;

    const pendingCommandMessage = useMemo(() => {
        if (pendingCommand === 'new-topic') {
            return 'Even geduld ajb, ik ben een nieuw onderwerp aan het bedenken...';
        }
        if (pendingCommand === 'goal-feedback') {
            return 'Even geduld ajb, ik stel je tussentijdse feedback samen...';
        }
        return null;
    }, [pendingCommand]);

    return (
        <div className={styles.sessionLayout}>
            <section className={styles.conversationColumn}>
                <ConversationView transcripts={transcripts} onWordSelect={handleWordSelect} />
            </section>

            {isMobile ? (
                <>
                    <MobileSessionControls
                        isOpen={isControlsOpen}
                        onToggle={handleToggleControls}
                        playbackRate={playbackRate}
                        onRateChange={setPlaybackRate}
                        onRequestFollowUp={handleRequestFollowUp}
                        onRequestNewTopic={handleRequestNewTopic}
                        onRequestGoalChange={handleRequestGoalChange}
                        onRequestGoalFeedback={handleRequestGoalFeedback}
                        commandPending={commandPending}
                        commandFeedback={commandFeedback}
                        talkStats={talkStats}
                        talkStatsSummary={talkStatsSummary}
                        goalSelectionOpen={goalSelectionState.open}
                        pendingCommand={pendingCommand}
                        isSessionActive={isSessionActive}
                        isRecording={isRecording}
                    />
                    <FloatingMicButton
                        isRecording={isRecording}
                        isSessionActive={isSessionActive}
                        isSessionReady={isSessionReady}
                        onToggle={toggleRecording}
                        sheetOpen={isControlsOpen}
                    />
                </>
            ) : (
                <aside className={styles.desktopSessionControls}>
                    {pendingCommandMessage && (
                        <div className={styles.topicProgress} role="status" aria-live="polite">
                            <span className={styles.topicProgressLabel}>{pendingCommandMessage}</span>
                            <div className={styles.topicProgressBar}>
                                <span className={styles.topicProgressFill} />
                            </div>
                        </div>
                    )}
                    <div className={styles.desktopCommandGroup}>
                        <div className={styles.commandBar}>
                            <button
                                type="button"
                                className={styles.commandButton}
                                onClick={handleRequestFollowUp}
                                disabled={commandsDisabled}
                                title="Vraag de tutor om een verdiepende vervolgvraag te stellen."
                            >
                                Vraag door
                            </button>
                            <button
                                type="button"
                                className={styles.commandButton}
                                onClick={handleRequestNewTopic}
                                disabled={commandsDisabled}
                                title="Schakel naar een nieuw gespreksonderwerp."
                            >
                                Nieuw onderwerp
                            </button>
                            <button
                                type="button"
                                className={styles.commandButton}
                                onClick={handleRequestGoalFeedback}
                                disabled={commandsDisabled}
                                title="Vraag de tutor om tussentijdse feedback over jouw leerdoelen."
                            >
                                Tussentijdse feedback
                            </button>
                            <button
                                type="button"
                                className={styles.commandButton}
                                onClick={handleRequestGoalChange}
                                disabled={commandsDisabled}
                                title="Wijzig het leerdoel van deze sessie."
                            >
                                Leerdoel wijzigen
                            </button>
                        </div>
                        {commandFeedback && <div className={styles.commandFeedback}>{commandFeedback}</div>}
                    </div>
                    {talkStats.hasData && (
                        <div className={styles.talkTimeCard}>
                            <div className={styles.talkTimeHeader}>Spreektijd tot nu toe</div>
                            <div className={styles.talkTimeBar}>
                                <div className={styles.talkTimeSegmentUser} style={{ width: `${talkStats.userWidth}%` }} />
                                <div className={styles.talkTimeSegmentTutor} style={{ width: `${talkStats.tutorWidth}%` }} />
                            </div>
                            <div className={styles.talkTimeLegend}>
                                <span>Jij {talkStatsSummary?.userPercent ?? 0}%</span>
                                <span>Tutor {talkStatsSummary?.tutorPercent ?? 0}%</span>
                            </div>
                        </div>
                    )}
                    <div className={styles.desktopPlaybackCard}>
                        <PlaybackSpeedSelector playbackRate={playbackRate} onRateChange={setPlaybackRate} />
                    </div>
                </aside>
            )}
            <GoalSelectionModal
                open={goalSelectionState.open}
                selectedGoals={goalSelectionState.pendingGoals}
                onGoalsChange={updatePendingGoals}
                onConfirm={confirmGoalSelection}
                onCancel={cancelGoalSelection}
            />
        </div >
    );
};
