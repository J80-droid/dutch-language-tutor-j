import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    useRef,
} from 'react';
import {
    GamificationData,
    NotificationReminder,
    ProgressData,
    StreakPeriod,
    GamificationXPSource,
    CEFRLevel,
    ActivityMode,
    LearningGoal,
    MissionProgress,
    BadgeProgress,
    MinigameResult,
    SeasonalEventProgress,
} from '../types';
import {
    cloneGamificationData,
    createDefaultGamificationData,
    ensureGamificationData,
    getLevelProgressInfo,
    addExperience,
    ensureDailyMissions,
    applySessionToMissions,
    evaluateBadges,
    getBadgeCatalog,
    recordMinigameResult,
    ensureSeasonalEvents,
    applySeasonalProgress,
    loadGamificationData,
    saveGamificationData,
    XPLevelProgress,
    XPUpdateResult,
} from '../utils/gamificationUtils';
import {
    NotificationPermissionValue,
    buildStreakReminderCopy,
    getNotificationPermission,
    isNotificationSupported,
    isReminderDue,
    requestNotificationPermission,
    showBrowserNotification,
} from '../utils/notificationUtils';

interface GamificationContextValue {
    data: GamificationData;
    loading: boolean;
    refresh: () => void;
    setData: (next: GamificationData) => void;
    updateData: (updater: (draft: GamificationData) => void) => void;
    syncProgressSnapshot: (progress: ProgressData) => void;
    pendingReminders: NotificationReminder[];
    dueReminders: NotificationReminder[];
    notificationPermission: NotificationPermissionValue;
    requestNotificationAccess: () => Promise<NotificationPermissionValue>;
    dismissReminder: (id: string) => void;
    grantXP: (amount: number, source: GamificationXPSource, metadata?: Record<string, unknown>) => XPUpdateResult;
    levelProgress: XPLevelProgress;
    missions: MissionProgress[];
    refreshMissions: (level: CEFRLevel) => void;
    registerMissionProgress: (session: { level: CEFRLevel; activity: ActivityMode; goal: LearningGoal }) => MissionProgress[];
    badgeCatalog: BadgeProgress[];
    unlockBadges: (context: { level: number; totalSessions: number; dailyStreak: number; missionsCompleted: number }) => BadgeProgress[];
    registerMinigameResult: (result: MinigameResult) => void;
    seasonalEvents: SeasonalEventProgress[];
    refreshSeasonalEvents: () => void;
    registerSeasonalProgress: (session: { level: CEFRLevel; activity: ActivityMode; goal: LearningGoal }) => SeasonalEventProgress[];
}

const GamificationContext = createContext<GamificationContextValue | undefined>(undefined);

const REMINDER_CHECK_INTERVAL_MS = 60 * 1000;

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [data, setData] = useState<GamificationData>(() => createDefaultGamificationData());
    const [loading, setLoading] = useState<boolean>(true);
    const seasonalEnsuredRef = useRef(false);

    useEffect(() => {
        const initial = loadGamificationData();
        setData(initial);
        setLoading(false);
    }, []);

    const setDataPersisted = useCallback((next: GamificationData) => {
        const sanitized = ensureGamificationData(next);
        setData(sanitized);
        saveGamificationData(sanitized);
    }, []);

    const updateData = useCallback((updater: (draft: GamificationData) => void) => {
        setData(prev => {
            const draft = cloneGamificationData(prev);
            updater(draft);
            const sanitized = ensureGamificationData(draft);
            saveGamificationData(sanitized);
            return sanitized;
        });
    }, []);

    const refresh = useCallback(() => {
        const reloaded = loadGamificationData();
        setData(reloaded);
    }, []);

    const requestNotificationAccess = useCallback(async (): Promise<NotificationPermissionValue> => {
        const permission = await requestNotificationPermission();
        updateData(draft => {
            draft.notifications.permission = permission;
            draft.notifications.lastPromptAt = new Date().toISOString();
        });
        return permission;
    }, [updateData]);

    const refreshMissions = useCallback(
        (level: CEFRLevel) => {
            updateData(draft => {
                ensureDailyMissions(draft, level);
            });
        },
        [updateData],
    );

    const refreshSeasonalEvents = useCallback(() => {
        updateData(draft => {
            ensureSeasonalEvents(draft);
        });
    }, [updateData]);

    useEffect(() => {
        if (!isNotificationSupported()) {
            return;
        }
        const browserPermission = getNotificationPermission();
        if (browserPermission !== data.notifications.permission) {
            updateData(draft => {
                draft.notifications.permission = browserPermission;
            });
        }
    }, [data.notifications.permission, updateData]);

    useEffect(() => {
        if (!loading && !seasonalEnsuredRef.current) {
            seasonalEnsuredRef.current = true;
            updateData(draft => {
                ensureSeasonalEvents(draft);
            });
        }
    }, [loading, updateData]);

    const syncProgressSnapshot = useCallback(
        (progress: ProgressData) => {
            updateData(draft => {
                draft.lastProgressSnapshot = {
                    data: progress,
                    updatedAt: new Date().toISOString(),
                };
            });
        },
        [updateData],
    );

    const pendingReminders = useMemo(
        () => data.notifications.reminders.filter(reminder => !reminder.delivered),
        [data.notifications.reminders],
    );

    const dueReminders = useMemo(
        () => pendingReminders.filter(isReminderDue),
        [pendingReminders],
    );

    const levelProgress = useMemo(() => getLevelProgressInfo(data.xp), [data.xp]);
    const badgeCatalog = useMemo(() => getBadgeCatalog(data), [data]);
    const seasonalEvents = useMemo(() => data.seasonalEvents, [data.seasonalEvents]);

    const dismissReminder = useCallback(
        (id: string) => {
            updateData(draft => {
                const reminder = draft.notifications.reminders.find(item => item.id === id);
                if (reminder) {
                    reminder.delivered = true;
                }
            });
        },
        [updateData],
    );

    useEffect(() => {
        if (loading || !isNotificationSupported()) {
            return;
        }
        if (data.notifications.permission !== 'granted') {
            return;
        }

        const deliver = () => {
            const due = data.notifications.reminders.filter(
                reminder => !reminder.delivered && isReminderDue(reminder),
            );
            if (!due.length) {
                return;
            }

            due.forEach(reminder => {
                const period = (reminder.payload?.period as StreakPeriod) ?? 'daily';
                const deadline =
                    typeof reminder.payload?.deadline === 'string'
                        ? reminder.payload.deadline
                        : reminder.scheduledFor;
                const copy = buildStreakReminderCopy(period, deadline);
                void showBrowserNotification({
                    title: copy.title,
                    body: copy.body,
                    tag: `streak-${period}`,
                    data: { reminderId: reminder.id, period },
                });
            });

            updateData(draft => {
                due.forEach(dueReminder => {
                    const target = draft.notifications.reminders.find(item => item.id === dueReminder.id);
                    if (target) {
                        target.delivered = true;
                    }
                });
            });
        };

        deliver();
        const intervalId = window.setInterval(deliver, REMINDER_CHECK_INTERVAL_MS);
        return () => window.clearInterval(intervalId);
    }, [data.notifications.permission, data.notifications.reminders, loading, updateData]);

    const grantXP = useCallback(
        (amount: number, source: GamificationXPSource, metadata?: Record<string, unknown>) => {
            let result: XPUpdateResult | null = null;
            updateData(draft => {
                result = addExperience(draft, amount, source, metadata);
            });
            return (
                result ?? {
                    amount: 0,
                    total: data.xp.total,
                    previousLevel: data.xp.level,
                    newLevel: data.xp.level,
                    xpIntoLevel: levelProgress.xpIntoLevel,
                    xpForNextLevel: levelProgress.xpForNextLevel,
                    progress: levelProgress.progress,
                }
            );
        },
        [data.xp.level, data.xp.total, levelProgress.progress, levelProgress.xpForNextLevel, levelProgress.xpIntoLevel, updateData],
    );

    const registerMissionProgress = useCallback(
        (session: { level: CEFRLevel; activity: ActivityMode; goal: LearningGoal }) => {
            let completed: MissionProgress[] = [];
            updateData(draft => {
                completed = applySessionToMissions(draft, session);
            });
            return completed;
        },
        [updateData],
    );

    const unlockBadges = useCallback(
        (context: { level: number; totalSessions: number; dailyStreak: number; missionsCompleted: number }): BadgeProgress[] => {
            let unlockedBadges: BadgeProgress[] = [];
            updateData(draft => {
                unlockedBadges = evaluateBadges(draft, context);
            });
            return unlockedBadges;
        },
        [updateData],
    );

    const registerSeasonalProgress = useCallback(
        (session: { level: CEFRLevel; activity: ActivityMode; goal: LearningGoal }) => {
            let completed: SeasonalEventProgress[] = [];
            updateData(draft => {
                completed = applySeasonalProgress(draft, session);
            });
            return completed;
        },
        [updateData],
    );

    const registerMinigameResult = useCallback(
        (result: MinigameResult) => {
            updateData(draft => {
                recordMinigameResult(draft, result);
            });
        },
        [updateData],
    );

    const value = useMemo<GamificationContextValue>(
        () => ({
            data,
            loading,
            refresh,
            setData: setDataPersisted,
            updateData,
            syncProgressSnapshot,
            pendingReminders,
            dueReminders,
            notificationPermission: data.notifications.permission,
            requestNotificationAccess,
            dismissReminder,
            grantXP,
            levelProgress,
            missions: data.missions,
            refreshMissions,
            registerMissionProgress,
            badgeCatalog,
            unlockBadges,
            registerMinigameResult,
            seasonalEvents,
            refreshSeasonalEvents,
            registerSeasonalProgress,
        }),
        [
            data,
            dismissReminder,
            loading,
            grantXP,
            requestNotificationAccess,
            refresh,
            refreshMissions,
            registerMissionProgress,
            unlockBadges,
            registerMinigameResult,
            seasonalEvents,
            refreshSeasonalEvents,
            registerSeasonalProgress,
            setDataPersisted,
            updateData,
            syncProgressSnapshot,
            pendingReminders,
            dueReminders,
            levelProgress,
            badgeCatalog,
        ],
    );

    return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
};

const useGamificationContext = (): GamificationContextValue => {
    const context = useContext(GamificationContext);
    if (!context) {
        throw new Error('useGamificationState moet binnen een GamificationProvider gebruikt worden.');
    }
    return context;
};

export const useGamificationState = useGamificationContext;

export const useGamificationData = () => {
    const { data, loading, refresh, setData, updateData } = useGamificationContext();
    return { data, loading, refresh, setData, updateData };
};

export const useGamificationSync = () => {
    const { loading, syncProgressSnapshot, refresh } = useGamificationContext();
    return { loading, syncProgressSnapshot, refresh };
};

export const useGamificationNotifications = () => {
    const {
        pendingReminders,
        dueReminders,
        notificationPermission,
        requestNotificationAccess,
        dismissReminder,
    } = useGamificationContext();
    return {
        pendingReminders,
        dueReminders,
        notificationPermission,
        requestNotificationAccess,
        dismissReminder,
    };
};

export const useGamificationXP = () => {
    const { grantXP, levelProgress } = useGamificationContext();
    return { grantXP, levelProgress };
};

export const useMissionService = () => {
    const { missions, refreshMissions, registerMissionProgress } = useGamificationContext();
    return { missions, refreshMissions, registerMissionProgress };
};

export const useBadgeService = () => {
    const { badgeCatalog, unlockBadges } = useGamificationContext();
    return { badgeCatalog, unlockBadges };
};

export const useMinigameService = () => {
    const { registerMinigameResult } = useGamificationContext();
    return { registerMinigameResult };
};

export const useSeasonalService = () => {
    const { seasonalEvents, refreshSeasonalEvents, registerSeasonalProgress } = useGamificationContext();
    return { seasonalEvents, refreshSeasonalEvents, registerSeasonalProgress };
};
