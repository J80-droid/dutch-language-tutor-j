import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import styles from '../styles/AppShell.module.css';
import { useUIState } from '../providers/UIProvider';
import { useSessionState } from '../providers/SessionProvider';
import { useGamificationNotifications, useGamificationXP } from '@/hooks/useGamificationState';
import ControlPanel from '@/components/ControlPanel';
import { HomeIcon, DashboardIcon, HistoryIcon, ChatIcon, SettingsIcon, MissionIcon, GameIcon, MenuIcon, CloseIcon, SRSIcon, TestIcon, PathIcon, WriteIcon, SpeechIcon, TrophyIcon, UserIcon } from '@/components/Icons';
import { SetupView } from '../views/SetupView';
import { SessionView } from '../views/SessionView';
import SessionLaunchOverlay from '@/components/SessionLaunchOverlay';
import { formatTimeUntil } from '@/utils/notificationUtils';
import { getUnlockedThemes } from '@/utils/themeUtils';
import type { AppView } from '../state/ui/types';

const LazySummaryContainer = lazy(() =>
    import('../views/SummaryContainer').then(module => ({ default: module.SummaryContainer })),
);
const LazyHistoryView = lazy(() =>
    import('../views/HistoryView').then(module => ({ default: module.HistoryView })),
);
const LazyDashboardContainer = lazy(() =>
    import('../views/DashboardContainer').then(module => ({ default: module.DashboardContainer })),
);
const LazyMissionsContainer = lazy(() =>
    import('../views/MissionsContainer').then(module => ({ default: module.MissionsContainer })),
);
const LazyMinigameContainer = lazy(() =>
    import('../views/MinigameContainer').then(module => ({ default: module.MinigameContainer })),
);
const LazyExtraPracticeView = lazy(() =>
    import('../views/ExtraPracticeView'),
);
const LazyChatView = lazy(() => import('@/components/ChatView'));
const LazyTopicManagerView = lazy(() => import('@/components/TopicManagerView'));
const LazyCreativeWorkshopModal = lazy(() => import('@/components/CreativeWorkshopModal'));
const LazyWordDefinitionModal = lazy(() => import('@/components/WordDefinitionModal'));
const LazySRSReviewContainer = lazy(() => import('../views/SRSReviewContainer').then(module => ({ default: module.SRSReviewContainer })));
const LazyPlacementTestContainer = lazy(() => import('../views/PlacementTestContainer').then(module => ({ default: module.PlacementTestContainer })));
const LazyLearningPathContainer = lazy(() => import('../views/LearningPathContainer').then(module => ({ default: module.LearningPathContainer })));
const LazyWritingExerciseContainer = lazy(() => import('../views/WritingExerciseContainer').then(module => ({ default: module.WritingExerciseContainer })));
const LazySpeechExerciseContainer = lazy(() => import('../views/SpeechExerciseContainer').then(module => ({ default: module.SpeechExerciseContainer })));
const LazyGamificationContainer = lazy(() => import('../views/GamificationContainer').then(module => ({ default: module.GamificationContainer })));
const LazyUserProfileContainer = lazy(() => import('../views/UserProfileContainer').then(module => ({ default: module.UserProfileContainer })));

const NavButton: React.FC<{
    targetView: AppView;
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: (view: AppView) => void;
}> = ({ targetView, icon, label, active, onClick }) => (
    <button
        type="button"
        className={`${styles.navButton} ${active ? styles.navButtonActive : ''}`}
        onClick={() => onClick(targetView)}
        title={label}
    >
        {icon}
        <span className={styles.navLabel}>{label}</span>
    </button>
);

const LazyContentFallback: React.FC = () => (
    <div className={styles.lazyFallback} role="status" aria-live="polite">
        Bezig met laden…
    </div>
);

const renderView = (view: AppView) => {
    switch (view) {
        case 'setup':
            return <SetupView />;
        case 'session':
            return <SessionView />;
        case 'summary':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazySummaryContainer />
                </Suspense>
            );
        case 'history':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazyHistoryView />
                </Suspense>
            );
        case 'dashboard':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazyDashboardContainer />
                </Suspense>
            );
        case 'missions':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazyMissionsContainer />
                </Suspense>
            );
        case 'minigames':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazyMinigameContainer />
                </Suspense>
            );
        case 'extra-practice':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazyExtraPracticeView />
                </Suspense>
            );
        case 'chat':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazyChatView />
                </Suspense>
            );
        case 'topics':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazyTopicManagerView />
                </Suspense>
            );
        case 'srs-review':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazySRSReviewContainer />
                </Suspense>
            );
        case 'placement-test':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazyPlacementTestContainer />
                </Suspense>
            );
        case 'learning-paths':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazyLearningPathContainer />
                </Suspense>
            );
        case 'writing-exercise':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazyWritingExerciseContainer />
                </Suspense>
            );
        case 'speech-exercise':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazySpeechExerciseContainer />
                </Suspense>
            );
        case 'gamification':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazyGamificationContainer />
                </Suspense>
            );
        case 'profile':
            return (
                <Suspense fallback={<LazyContentFallback />}>
                    <LazyUserProfileContainer />
                </Suspense>
            );
        default:
            return <SetupView />;
    }
};

export const AppShell: React.FC = () => {
    const { view, setView, theme, setTheme } = useUIState();
    const session = useSessionState();
    const { dueReminders, notificationPermission, requestNotificationAccess, dismissReminder } = useGamificationNotifications();
    const { levelProgress } = useGamificationXP();

    const [isMobile, setIsMobile] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            setIsMobile(false);
            return;
        }

        const mediaQuery = window.matchMedia('(max-width: 768px)');

        const applyMatch = (matches: boolean) => {
            setIsMobile(matches);
            if (!matches) {
                setIsMobileNavOpen(false);
            }
        };

        applyMatch(mediaQuery.matches);

        const listener = (event: MediaQueryListEvent) => applyMatch(event.matches);

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', listener);
            return () => mediaQuery.removeEventListener('change', listener);
        }

        if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(listener);
            return () => mediaQuery.removeListener(listener);
        }

        return;
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }
        if (isMobileNavOpen) {
            const previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = previousOverflow;
            };
        }
        document.body.style.overflow = '';
        return () => undefined;
    }, [isMobileNavOpen]);

    useEffect(() => {
        if (!isMobile) {
            return;
        }
        setIsMobileNavOpen(false);
    }, [view, isMobile]);

    const shouldPromptNotifications = notificationPermission === 'default';
    const unlockedThemes = useMemo(() => getUnlockedThemes(levelProgress.level), [levelProgress.level]);

    const handleNavigate = (targetView: AppView) => {
        setView(targetView);
        setIsMobileNavOpen(false);
    };

    const talkStatsSummary = useMemo(() => {
        if (!session.talkStats.hasData) {
            return null;
        }
        return {
            userPercent: Math.round(session.talkStats.userShare * 100),
            tutorPercent: Math.round(session.talkStats.tutorShare * 100),
        };
    }, [session.talkStats]);

    const navClassName = [
        styles.nav,
        styles.mobileNav,
        isMobileNavOpen ? styles.mobileNavOpen : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={styles.app}>
            <header className={styles.header}>
                <div className={styles.logo}>Taalcoach J.𓅃</div>
                <nav id="app-nav" className={navClassName}>
                    <NavButton targetView="setup" icon={<HomeIcon />} label="Home" active={view === 'setup'} onClick={handleNavigate} />
                    <NavButton targetView="dashboard" icon={<DashboardIcon />} label="Voortgang" active={view === 'dashboard'} onClick={handleNavigate} />
                    <NavButton targetView="missions" icon={<MissionIcon />} label="Missies" active={view === 'missions'} onClick={handleNavigate} />
                    <NavButton targetView="minigames" icon={<GameIcon />} label="Spellen" active={view === 'minigames'} onClick={handleNavigate} />
                    <NavButton targetView="history" icon={<HistoryIcon />} label="Geschiedenis" active={view === 'history'} onClick={handleNavigate} />
                    <NavButton targetView="chat" icon={<ChatIcon />} label="Chatbot" active={view === 'chat'} onClick={handleNavigate} />
                    <NavButton targetView="topics" icon={<SettingsIcon />} label="Topics" active={view === 'topics'} onClick={handleNavigate} />
                    <NavButton targetView="srs-review" icon={<SRSIcon />} label="Woorden" active={view === 'srs-review'} onClick={handleNavigate} />
                    <NavButton targetView="learning-paths" icon={<PathIcon />} label="Leerpaden" active={view === 'learning-paths'} onClick={handleNavigate} />
                    <NavButton targetView="gamification" icon={<TrophyIcon />} label="Gamificatie" active={view === 'gamification'} onClick={handleNavigate} />
                    <NavButton targetView="profile" icon={<UserIcon />} label="Profiel" active={view === 'profile'} onClick={handleNavigate} />
                </nav>
                <div className={styles.headerRight}>
                    <button
                        type="button"
                        className={styles.menuToggle}
                        onClick={() => setIsMobileNavOpen(open => !open)}
                        aria-expanded={isMobileNavOpen}
                        aria-controls="app-nav"
                        aria-label={isMobileNavOpen ? 'Sluit navigatie' : 'Open navigatie'}
                    >
                        {isMobileNavOpen ? <CloseIcon /> : <MenuIcon />}
                    </button>
                </div>
            </header>
            {isMobileNavOpen && (
                <button
                    type="button"
                    className={`${styles.mobileNavBackdrop} ${styles.mobileNavBackdropOpen}`}
                    onClick={() => setIsMobileNavOpen(false)}
                    aria-hidden="true"
                    tabIndex={-1}
                />
            )}

            <main className={styles.main}>
                {shouldPromptNotifications && (
                    <div className={styles.notificationPrompt}>
                        <span>Wil je een seintje wanneer je streak bijna breekt?</span>
                        <button type="button" className={styles.bannerButton} onClick={() => void requestNotificationAccess()}>
                            Meldingen inschakelen
                        </button>
                    </div>
                )}
                {dueReminders.map(reminder => {
                    const period = (reminder.payload?.period as string) ?? 'daily';
                    const deadline = typeof reminder.payload?.deadline === 'string' ? reminder.payload.deadline : reminder.scheduledFor;
                    const countdown = formatTimeUntil(deadline);
                    const countdownLabel = countdown === 'nu' ? 'heel kort' : countdown;
                    const periodLabel = period === 'daily' ? 'dagelijkse' : 'wekelijkse';
                    return (
                        <div key={reminder.id} className={styles.reminderBanner}>
                            <div>
                                <div className={styles.reminderTitle}>{periodLabel} streak-alert</div>
                                <div className={styles.reminderText}>
                                    Je {periodLabel} streak verloopt over {countdownLabel}. Start een sessie om de reeks te behouden.
                                </div>
                            </div>
                            <button type="button" className={styles.bannerButton} onClick={() => dismissReminder(reminder.id)}>
                                Geregeld
                            </button>
                        </div>
                    );
                })}
                {renderView(view)}
            </main>

            {view === 'session' && !isMobile && (
                <footer className={styles.footer}>
                    <ControlPanel
                        isRecording={session.isRecording}
                        isSessionActive={session.isSessionActive}
                        isSessionReady={session.isSessionReady}
                        onToggleRecording={session.toggleRecording}
                        onEndSession={session.endSession}
                        talkStats={session.talkStats}
                        talkStatsSummary={talkStatsSummary}
                    />
                </footer>
            )}

            {session.isCreativeModalOpen && session.pendingCreativeMode && (
                <Suspense fallback={null}>
                    <LazyCreativeWorkshopModal
                        mode={session.pendingCreativeMode}
                        level={session.selectedLevel}
                        isOpen={session.isCreativeModalOpen}
                        initialState={session.creativeWorkshops[session.pendingCreativeMode] ?? null}
                        onClose={session.closeCreativeModal}
                        onConfirm={state => {
                            session.setCreativeWorkshopState(state);
                            session.closeCreativeModal();
                            session.startSession({
                                mode: state.mode,
                                goals: session.effectiveGoalsForMode(state.mode),
                                strictness: session.feedbackStrictness,
                                creative: state,
                            });
                        }}
                    />
                </Suspense>
            )}

            {session.selectedWord && (
                <Suspense fallback={null}>
                    <LazyWordDefinitionModal word={session.selectedWord} onClose={() => session.setSelectedWord(null)} />
                </Suspense>
            )}
    <SessionLaunchOverlay
        active={session.sessionLaunchState.active}
        progress={session.sessionLaunchState.progress}
        label={session.sessionLaunchState.label}
        sublabel={session.sessionLaunchState.sublabel}
        error={session.sessionLaunchState.error}
    />
        </div>
    );
};

export default AppShell;

