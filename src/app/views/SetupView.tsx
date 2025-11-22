import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../styles/AppShell.module.css';
import LevelSelector from '@/components/LevelSelector';
import LevelProgressPreview from '@/components/LevelProgressPreview';
import ActivitySelector from '@/components/ActivitySelector';
import GoalSelector from '@/components/GoalSelector';
import StrictnessSettings from '@/components/StrictnessSettings';
import { useSessionState } from '../providers/SessionProvider';
import { getNextThemeUnlock, getUnlockedThemes, THEME_UNLOCK_LEVEL } from '@/utils/themeUtils';
import { CEFR_LEVELS, LEARNING_GOAL_METADATA, type StrictnessLevel, type ActivityMode } from '@/types';
import type { NewsFeedEntry } from '@/services/newsFeedService';
import { LEVEL_THEMES } from '@/components/levelThemes';
import { loadSetupPreferences, saveSetupPreferences } from '@/utils/setupPreferences';
import { useUIState } from '../providers/UIProvider';

const PlacementTestButton: React.FC = () => {
    const { setView } = useUIState();
    return (
        <>
            <button
                type="button"
                onClick={() => setView('placement-test')}
                className={styles.placementTestButton}
            >
                Doe Instaptoets
            </button>
            <p className={styles.placementTestDescription}>
                Bepaal je niveau met een adaptieve test
            </p>
        </>
    );
};

const STRICTNESS_LEVEL_LABELS: Record<StrictnessLevel, string> = {
    1: 'Zacht',
    2: 'Mild',
    3: 'Normaal',
    4: 'Streng',
    5: 'Intens',
};

export const SetupView: React.FC = () => {
    const {
        selectedLevel,
        setSelectedLevel,
        selectedMode,
        setSelectedMode,
        progress,
        levelProgress,
        selectedGoals,
        setSelectedGoals,
        feedbackStrictness,
        updateFeedbackStrictness,
        resetFeedbackStrictness,
        newsEnabled,
        setNewsEnabled,
        newsHeadlines,
        newsLoading,
        newsError,
        newsLastUpdated,
        selectedNewsId,
        selectedNewsHeadline,
        selectNewsHeadline,
        refreshNewsHeadlines,
        startSession,
    } = useSessionState();

    const storedPreferences = useMemo(() => loadSetupPreferences(), []);
    const [preferencesCollapsed, setPreferencesCollapsed] = useState<boolean>(() =>
        storedPreferences.onboardingCompleted ? storedPreferences.collapsed : false,
    );
    const isPreferencesExpanded = !preferencesCollapsed;
    const [showPreferencesCoachmark, setShowPreferencesCoachmark] = useState<boolean>(() => !storedPreferences.onboardingCompleted);

    const unlockedThemes = useMemo(() => getUnlockedThemes(levelProgress.level), [levelProgress.level]);
    const nextThemeUnlock = useMemo(() => getNextThemeUnlock(levelProgress.level), [levelProgress.level]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }
        const theme = LEVEL_THEMES[selectedLevel];
        if (theme?.background) {
            document.documentElement.style.setProperty('--level-bg', theme.background);
        } else {
            document.documentElement.style.removeProperty('--level-bg');
        }
        if (theme?.panelBackground) {
            document.documentElement.style.setProperty('--level-panel-bg', theme.panelBackground);
        } else {
            document.documentElement.style.removeProperty('--level-panel-bg');
        }
        if (theme?.panelBorder) {
            document.documentElement.style.setProperty('--level-panel-border', theme.panelBorder);
        } else {
            document.documentElement.style.removeProperty('--level-panel-border');
        }
        if (theme?.logoColor) {
            document.documentElement.style.setProperty('--level-logo-color', theme.logoColor);
        } else {
            document.documentElement.style.removeProperty('--level-logo-color');
        }
        theme?.menuAccents?.forEach((accent, index) => {
            document.documentElement.style.setProperty(`--menu-accent-${index + 1}`, accent);
        });
        if (!theme?.menuAccents) {
            for (let i = 1; i <= 6; i += 1) {
                document.documentElement.style.removeProperty(`--menu-accent-${i}`);
            }
        }
    }, [selectedLevel]);

    useEffect(() => {
        if (showPreferencesCoachmark && preferencesCollapsed) {
            setPreferencesCollapsed(false);
        }
    }, [preferencesCollapsed, showPreferencesCoachmark]);

    const handleTogglePreferencesCollapsed = () => {
        setPreferencesCollapsed(prev => {
            const next = !prev;
            saveSetupPreferences({ collapsed: next });
            return next;
        });
    };

    const handleDismissPreferencesCoachmark = () => {
        setShowPreferencesCoachmark(false);
        saveSetupPreferences({
            onboardingCompleted: true,
            collapsed: true,
        });
    };

    const goalSummary = useMemo(() => {
        const labels = selectedGoals.map(goal => LEARNING_GOAL_METADATA[goal]?.label ?? goal);
        if (labels.length === 0) {
            return 'Geen doelen geselecteerd';
        }
        if (labels.length === 1) {
            return labels[0];
        }
        if (labels.length === 2) {
            return `${labels[0]} • ${labels[1]}`;
        }
        return `${labels.slice(0, 2).join(' • ')} +${labels.length - 2}`;
    }, [selectedGoals]);

    const strictnessSummary = useMemo(() => {
        const levels = Object.values(feedbackStrictness) as StrictnessLevel[];
        if (levels.length === 0) {
            return 'Geen voorkeur';
        }
        const average = Math.round(levels.reduce((total, level) => total + level, 0) / levels.length) as StrictnessLevel;
        const label = STRICTNESS_LEVEL_LABELS[average] ?? STRICTNESS_LEVEL_LABELS[3];
        return `${label} (${average}/5)`;
    }, [feedbackStrictness]);

    const preferencesSummary = useMemo(
        () => `${goalSummary} • Correctie: ${strictnessSummary}`,
        [goalSummary, strictnessSummary],
    );

    const handleModeSelect = useCallback((mode: ActivityMode) => {
        setSelectedMode(mode);
        void startSession({ mode });
    }, [setSelectedMode, startSession]);

    const handleStartSessionFromNews = useCallback(
        (headline: NewsFeedEntry) => {
            setSelectedMode('conversation');
            void startSession({ mode: 'conversation', newsHeadline: headline });
        },
        [setSelectedMode, startSession],
    );

    const newsSectionProps = useMemo(
        () => ({
            enabled: newsEnabled,
            onToggleEnabled: setNewsEnabled,
            headlines: newsHeadlines,
            loading: newsLoading,
            error: newsError,
            lastUpdated: newsLastUpdated,
            selectedHeadlineId: selectedNewsId,
            onSelectHeadline: selectNewsHeadline,
            selectedHeadline: selectedNewsHeadline,
            onRefresh: refreshNewsHeadlines,
            onStartSessionFromHeadline: handleStartSessionFromNews,
        }),
        [
            newsEnabled,
            setNewsEnabled,
            newsHeadlines,
            newsLoading,
            newsError,
            newsLastUpdated,
            selectedNewsId,
            selectNewsHeadline,
            selectedNewsHeadline,
            refreshNewsHeadlines,
            handleStartSessionFromNews,
        ],
    );

    return (
        <div className={styles.setupContainer}>
            <p className={styles.setupLead}>Kies je niveau en een activiteit om te beginnen.</p>
            <div className={styles.setupSectionCard}>
                <LevelSelector levels={CEFR_LEVELS} selectedLevel={selectedLevel} onSelectLevel={setSelectedLevel} />
                <LevelProgressPreview
                    progress={progress}
                    selectedLevel={selectedLevel}
                    onSelectLevel={setSelectedLevel}
                    levelProgress={levelProgress}
                    nextThemeUnlock={nextThemeUnlock}
                    themeUnlockLevels={THEME_UNLOCK_LEVEL}
                />
            </div>
            <div className={`${styles.setupSectionCard} ${styles.setupPreferencesCard}`}>
                {showPreferencesCoachmark && !preferencesCollapsed && (
                    <div className={styles.setupCoachmark} role="dialog" aria-modal="false" aria-live="polite">
                        <h4 className={styles.setupCoachmarkTitle}>Stel je voorkeuren in</h4>
                        <p className={styles.setupCoachmarkText}>
                            Kies je leerdoelen en hoe streng de tutor corrigeert. We bewaren deze voorkeuren voor je volgende sessies.
                        </p>
                        <button
                            type="button"
                            className={styles.setupCoachmarkButton}
                            onClick={handleDismissPreferencesCoachmark}
                        >
                            Begrepen
                        </button>
                    </div>
                )}
                <div className={styles.collapsibleWrapper}>
                    <button
                        type="button"
                        className={`${styles.collapsibleButton} ${
                            isPreferencesExpanded ? styles.collapsibleButtonOpen : ''
                        }`}
                        onClick={handleTogglePreferencesCollapsed}
                        aria-expanded={isPreferencesExpanded}
                        aria-controls="setup-preferences-section"
                    >
                        <div className={styles.collapsibleTitleGroup}>
                            <span className={styles.collapsibleTitle}>Leerdoelen &amp; correctiestrictheid</span>
                            <span className={styles.collapsibleSummary}>{preferencesSummary}</span>
                        </div>
                        <span
                            className={`${styles.collapsibleIcon} ${
                                !preferencesCollapsed ? styles.collapsibleIconOpen : ''
                            }`}
                            aria-hidden="true"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M6 9l6 6 6-6"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </span>
                    </button>
                    <div
                        id="setup-preferences-section"
                        className={`${styles.collapsibleContent} ${
                            preferencesCollapsed ? styles.collapsibleContentHidden : ''
                        }`}
                        hidden={preferencesCollapsed}
                    >
                        <GoalSelector
                            selectedGoals={selectedGoals}
                            onUpdateGoals={setSelectedGoals}
                            label="Leerdoelen"
                        />
                        <StrictnessSettings
                            value={feedbackStrictness}
                            onChange={updateFeedbackStrictness}
                            onReset={resetFeedbackStrictness}
                        />
                    </div>
                </div>
            </div>
            <div className={styles.setupSectionCard}>
                <h3 id="activities-heading" className={styles.sectionTitle}>
                    Activiteiten
                </h3>
                <ActivitySelector
                    selectedMode={selectedMode}
                    onSelectMode={handleModeSelect}
                    newsSection={newsSectionProps}
                />
                <div className={styles.placementTestWrapper}>
                    <PlacementTestButton />
                </div>
            </div>
        </div>
    );
};


