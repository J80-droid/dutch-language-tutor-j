import {
    GamificationData,
    GamificationXPSource,
    ActivityMode,
    LearningGoal,
    CEFRLevel,
    NotificationReminder,
    NotificationState,
    StreakDeadline,
    StreakMilestoneUnlock,
    StreakPeriod,
    StreakState,
    StreakStats,
    StreakUpdateSummary,
    MissionProgress,
    MissionObjective,
    MissionReward,
    MinigameResult,
    SeasonalEventProgress,
    XPState,
    Transcript,
} from '../types';

export const GAMIFICATION_STORAGE_KEY = 'gamificationState';
export const GAMIFICATION_DATA_VERSION = 1;

const isBrowserEnvironment = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const MAX_STREAK_HISTORY = 120;
const MAX_XP_HISTORY = 250;
const MAX_MINIGAME_HISTORY = 50;
const DEFAULT_SEASONAL_TARGET_SESSIONS = 5;
export const STREAK_MILESTONES = [7, 14, 30];
export const DAILY_REMINDER_LEAD_HOURS = 6;
export const WEEKLY_REMINDER_LEAD_HOURS = 24;
const LEVEL_CAP = 50;
const BASE_LEVEL_REQUIREMENT = 240;
const LEVEL_GROWTH = 80;

interface SeasonalEventDefinition {
    id: string;
    name: string;
    description: string;
    startMonth: number;
    startDay: number;
    endMonth: number;
    endDay: number;
    theme: string;
    targetSessions: number;
    focusActivity?: ActivityMode;
    rewardXp: number;
}

const SEASONAL_EVENT_DEFINITIONS: SeasonalEventDefinition[] = [
    {
        id: 'spring-conversations',
        name: 'Lenteboost',
        description: 'Focus op vlotte conversaties met lentetwists. Voltooi meerdere conversatiesessies tijdens het evenement.',
        startMonth: 3,
        startDay: 1,
        endMonth: 4,
        endDay: 30,
        theme: 'emerald',
        targetSessions: 5,
        focusActivity: 'conversation',
        rewardXp: 60,
    },
    {
        id: 'winter-storytelling',
        name: 'Wintervertellingen',
        description: 'Gebruik koude winteravonden om verhalen te creëren en uit te breiden met de tutor.',
        startMonth: 11,
        startDay: 15,
        endMonth: 1,
        endDay: 15,
        theme: 'violet',
        targetSessions: 4,
        focusActivity: 'creative-story-relay',
        rewardXp: 75,
    },
];

const LEVEL_THRESHOLDS: number[] = [0, 0];
for (let level = 2; level <= LEVEL_CAP + 1; level += 1) {
    const previous = LEVEL_THRESHOLDS[level - 1];
    const requirement = BASE_LEVEL_REQUIREMENT + (level - 2) * LEVEL_GROWTH;
    LEVEL_THRESHOLDS[level] = previous + requirement;
}

const resolveLevelFromXP = (xpTotal: number) => {
    let level = 1;
    while (level < LEVEL_CAP && xpTotal >= LEVEL_THRESHOLDS[level + 1]) {
        level += 1;
    }
    const currentThreshold = LEVEL_THRESHOLDS[level] ?? 0;
    const nextThreshold = LEVEL_THRESHOLDS[Math.min(level + 1, LEVEL_CAP + 1)] ?? currentThreshold;
    return { level, currentThreshold, nextThreshold };
};

const createDefaultStreakStats = (period: StreakPeriod): StreakStats => ({
    period,
    current: 0,
    longest: 0,
    history: [],
});

const createDefaultStreakState = (): StreakState => ({
    daily: createDefaultStreakStats('daily'),
    weekly: createDefaultStreakStats('weekly'),
    lastUpdated: new Date().toISOString(),
});

const createDefaultXPState = (): XPState => ({
    total: 0,
    level: 1,
    levelProgress: 0,
    history: [],
});

const createDefaultNotificationState = (): NotificationState => ({
    permission: 'default',
    reminders: [],
});

export const createDefaultGamificationData = (): GamificationData => ({
    version: GAMIFICATION_DATA_VERSION,
    streaks: createDefaultStreakState(),
    xp: createDefaultXPState(),
    missions: [],
    badges: [],
    minigames: [],
    seasonalEvents: [],
    notifications: createDefaultNotificationState(),
    lastSyncedAt: new Date().toISOString(),
});

const clampHistory = <T>(history: T[], max = MAX_STREAK_HISTORY): T[] =>
    history.length > max ? history.slice(history.length - max) : history;

const getStartOfDay = (input: Date): Date => {
    const date = new Date(input);
    date.setHours(0, 0, 0, 0);
    return date;
};

const getISODate = (date: Date): string => {
    const start = getStartOfDay(date);
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const differenceInDays = (later: Date, earlier: Date): number => {
    const diff = getStartOfDay(later).getTime() - getStartOfDay(earlier).getTime();
    return Math.round(diff / ONE_DAY_MS);
};

const getWeekStart = (input: Date): Date => {
    const date = getStartOfDay(input);
    const day = date.getDay();
    const diff = (day + 6) % 7; // zondag => 6, maandag => 0
    date.setDate(date.getDate() - diff);
    return date;
};

const differenceInWeeks = (later: Date, earlier: Date): number => {
    const laterWeekStart = getWeekStart(later);
    const earlierWeekStart = getWeekStart(earlier);
    const diff = laterWeekStart.getTime() - earlierWeekStart.getTime();
    return Math.round(diff / (7 * ONE_DAY_MS));
};

const createStorageId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `rem-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
};

const calculateReminderTime = (deadline: Date, leadHours: number): Date => {
    const target = new Date(deadline.getTime() - leadHours * ONE_HOUR_MS);
    if (target.getTime() <= Date.now()) {
        return new Date(Date.now() + 5 * ONE_MINUTE_MS);
    }
    return target;
};

const scheduleStreakReminder = (
    data: GamificationData,
    period: StreakPeriod,
    deadline: Date,
    leadHours: number,
) => {
    const reminderTime = calculateReminderTime(deadline, leadHours);
    const reminder: NotificationReminder = {
        id: createStorageId(),
        type: 'streak-warning',
        scheduledFor: reminderTime.toISOString(),
        createdAt: new Date().toISOString(),
        delivered: false,
        payload: {
            period,
            deadline: deadline.toISOString(),
            leadHours,
        },
    };

    data.notifications.reminders = [
        ...data.notifications.reminders.filter(
            existing => !(existing.type === 'streak-warning' && existing.payload?.period === period),
        ),
        reminder,
    ];
};

const ensureStreakStats = (input: unknown, period: StreakPeriod): StreakStats => {
    const base = createDefaultStreakStats(period);
    if (!input || typeof input !== 'object') {
        return base;
    }
    const candidate = input as Partial<StreakStats>;
    return {
        period,
        current: typeof candidate.current === 'number' && candidate.current >= 0 ? candidate.current : base.current,
        longest: typeof candidate.longest === 'number' && candidate.longest >= 0 ? candidate.longest : base.longest,
        lastCompletedDate: typeof candidate.lastCompletedDate === 'string' ? candidate.lastCompletedDate : base.lastCompletedDate,
        history: Array.isArray(candidate.history)
            ? clampHistory(candidate.history.filter(Boolean) as StreakStats['history'])
            : base.history,
    };
};

const ensureNotificationReminder = (reminder: NotificationReminder): NotificationReminder => ({
    ...reminder,
    delivered: Boolean(reminder.delivered),
    payload: reminder.payload && typeof reminder.payload === 'object' ? reminder.payload : undefined,
});

const ensureNotificationState = (input: unknown): NotificationState => {
    const base = createDefaultNotificationState();
    if (!input || typeof input !== 'object') {
        return base;
    }
    const candidate = input as Partial<NotificationState>;
    return {
        permission: candidate.permission === 'granted' || candidate.permission === 'denied' ? candidate.permission : 'default',
        lastPromptAt: typeof candidate.lastPromptAt === 'string' ? candidate.lastPromptAt : base.lastPromptAt,
        reminders: Array.isArray(candidate.reminders)
            ? candidate.reminders
                  .filter((item): item is NotificationReminder => Boolean(item && item.id && item.type && item.scheduledFor && item.createdAt))
                  .map(ensureNotificationReminder)
            : base.reminders,
    };
};

const ensureXPState = (input: unknown): XPState => {
    const base = createDefaultXPState();
    if (!input || typeof input !== 'object') {
        return base;
    }
    const candidate = input as Partial<XPState>;
    const total = typeof candidate.total === 'number' && Number.isFinite(candidate.total) ? candidate.total : base.total;
    const { level, currentThreshold, nextThreshold } = resolveLevelFromXP(total);
    const xpIntoLevel = total - currentThreshold;
    const xpForNextLevel = Math.max(nextThreshold - currentThreshold, 0);
    return {
        total,
        level,
        levelProgress: xpForNextLevel > 0 ? Math.min(xpIntoLevel / xpForNextLevel, 1) : 1,
        history: Array.isArray(candidate.history)
            ? clampHistory(candidate.history.filter(Boolean) as XPState['history'], MAX_XP_HISTORY)
            : base.history,
        lastEarnedAt: typeof candidate.lastEarnedAt === 'string' ? candidate.lastEarnedAt : base.lastEarnedAt,
    };
};

export const ensureGamificationData = (input?: Partial<GamificationData> | null): GamificationData => {
    const base = createDefaultGamificationData();
    if (!input || typeof input !== 'object') {
        return base;
    }

    const streaksCandidate = (input as Partial<GamificationData>).streaks;
    const streaks: StreakState = {
        daily: ensureStreakStats(streaksCandidate?.daily, 'daily'),
        weekly: ensureStreakStats(streaksCandidate?.weekly, 'weekly'),
        lastUpdated: typeof streaksCandidate?.lastUpdated === 'string' ? streaksCandidate.lastUpdated : base.streaks.lastUpdated,
    };

    return {
        version: GAMIFICATION_DATA_VERSION,
        streaks,
        xp: ensureXPState((input as Partial<GamificationData>).xp),
        missions: Array.isArray(input.missions) ? input.missions.filter(Boolean) : base.missions,
        badges: Array.isArray(input.badges) ? input.badges.filter(Boolean) : base.badges,
        minigames: Array.isArray(input.minigames) ? input.minigames.filter(Boolean) : base.minigames,
        seasonalEvents: Array.isArray(input.seasonalEvents) ? input.seasonalEvents.filter(Boolean) : base.seasonalEvents,
        notifications: ensureNotificationState((input as Partial<GamificationData>).notifications),
        lastProgressSnapshot: input.lastProgressSnapshot && typeof input.lastProgressSnapshot === 'object'
            ? {
                  data: input.lastProgressSnapshot.data,
                  updatedAt: typeof input.lastProgressSnapshot.updatedAt === 'string'
                      ? input.lastProgressSnapshot.updatedAt
                      : base.lastSyncedAt ?? new Date().toISOString(),
              }
            : undefined,
        lastSyncedAt: typeof input.lastSyncedAt === 'string' ? input.lastSyncedAt : base.lastSyncedAt,
    };
};

export const cloneGamificationData = (data: GamificationData): GamificationData =>
    JSON.parse(JSON.stringify(data)) as GamificationData;

const updateDailyStreakStats = (data: GamificationData, sessionDate: Date): number | undefined => {
    const daily = data.streaks.daily;
    const sessionDay = getISODate(sessionDate);
    const previousCurrent = daily.current;
    const lastDateString = daily.lastCompletedDate;

    if (lastDateString) {
        const lastDate = new Date(lastDateString);
        const diff = differenceInDays(sessionDate, lastDate);
        if (diff < 0 || diff === 0) {
            return undefined;
        }
        if (diff === 1) {
            daily.current = previousCurrent + 1;
        } else {
            daily.current = 1;
        }
    } else {
        daily.current = Math.max(previousCurrent, 1);
    }

    const delta = daily.current - previousCurrent;
    if (delta === 0 && lastDateString) {
        return undefined;
    }

    daily.longest = Math.max(daily.longest, daily.current);
    daily.lastCompletedDate = sessionDay;

    const reasons: string[] = [];
    if (!lastDateString) {
        reasons.push('start');
    }
    if (delta > 0) {
        reasons.push('increment');
    } else if (delta < 0) {
        reasons.push('reset');
    }

    const milestone = STREAK_MILESTONES.includes(daily.current) ? daily.current : undefined;
    if (milestone) {
        reasons.push(`milestone:${milestone}`);
    }

    daily.history = clampHistory([
        ...daily.history,
        {
            date: sessionDay,
            period: 'daily',
            delta,
            reason: reasons.length ? reasons.join('|') : undefined,
        },
    ]);

    return milestone;
};

const updateWeeklyStreakStats = (data: GamificationData, sessionDate: Date): void => {
    const weekly = data.streaks.weekly;
    const weekStart = getWeekStart(sessionDate);
    const weekToken = getISODate(weekStart);
    const previousCurrent = weekly.current;
    const lastWeekToken = weekly.lastCompletedDate;

    if (lastWeekToken) {
        const lastWeekDate = getWeekStart(new Date(lastWeekToken));
        const diffWeeks = differenceInWeeks(weekStart, lastWeekDate);
        if (diffWeeks < 0) {
            return;
        }
        if (diffWeeks === 0) {
            return;
        }
        if (diffWeeks === 1) {
            weekly.current = previousCurrent + 1;
        } else {
            weekly.current = 1;
        }
    } else {
        weekly.current = Math.max(previousCurrent, 1);
    }

    const delta = weekly.current - previousCurrent;
    weekly.longest = Math.max(weekly.longest, weekly.current);
    weekly.lastCompletedDate = weekToken;

    const reasons: string[] = [];
    if (!lastWeekToken) {
        reasons.push('start');
    } else if (delta > 0) {
        reasons.push('increment');
    } else if (delta < 0) {
        reasons.push('reset');
    }

    if (delta !== 0 || !lastWeekToken) {
        weekly.history = clampHistory([
            ...weekly.history,
            {
                date: weekToken,
                period: 'weekly',
                delta,
                reason: reasons.length ? reasons.join('|') : undefined,
            },
        ]);
    }
};

const updateStreakState = (data: GamificationData, sessionDate: Date): StreakUpdateSummary => {
    const milestone = updateDailyStreakStats(data, sessionDate);
    updateWeeklyStreakStats(data, sessionDate);

    const dailyDeadline = getStartOfDay(sessionDate);
    dailyDeadline.setDate(dailyDeadline.getDate() + 1);

    const weeklyDeadline = getWeekStart(sessionDate);
    weeklyDeadline.setDate(weeklyDeadline.getDate() + 7);

    scheduleStreakReminder(data, 'daily', dailyDeadline, DAILY_REMINDER_LEAD_HOURS);
    scheduleStreakReminder(data, 'weekly', weeklyDeadline, WEEKLY_REMINDER_LEAD_HOURS);

    data.streaks.lastUpdated = new Date().toISOString();

    const milestones: StreakMilestoneUnlock[] = milestone
        ? [
              {
                  period: 'daily',
                  value: milestone,
                  reachedAt: sessionDate.toISOString(),
              },
          ]
        : [];

    const deadlines: StreakDeadline[] = [
        {
            period: 'daily',
            deadline: dailyDeadline.toISOString(),
            leadMs: DAILY_REMINDER_LEAD_HOURS * ONE_HOUR_MS,
        },
        {
            period: 'weekly',
            deadline: weeklyDeadline.toISOString(),
            leadMs: WEEKLY_REMINDER_LEAD_HOURS * ONE_HOUR_MS,
        },
    ];

    return {
        daily: data.streaks.daily,
        weekly: data.streaks.weekly,
        milestonesUnlocked: milestones,
        deadlines,
    };
};

export const applySessionStreakUpdate = (
    sessionDate: Date = new Date(),
    existingData?: GamificationData,
): { data: GamificationData; summary: StreakUpdateSummary } => {
    const baseData = ensureGamificationData(
        existingData ? cloneGamificationData(existingData) : loadGamificationData(),
    );
    const summary = updateStreakState(baseData, sessionDate);
    saveGamificationData(baseData);
    return { data: baseData, summary };
};

export interface XPLevelProgress {
    level: number;
    totalXp: number;
    xpIntoLevel: number;
    xpForNextLevel: number;
    progress: number;
}

export interface XPUpdateResult {
    amount: number;
    total: number;
    previousLevel: number;
    newLevel: number;
    xpIntoLevel: number;
    xpForNextLevel: number;
    progress: number;
}

export const getLevelProgressInfo = (xpState: XPState): XPLevelProgress => {
    const { level, currentThreshold, nextThreshold } = resolveLevelFromXP(xpState.total);
    const xpIntoLevel = xpState.total - currentThreshold;
    const xpForNextLevel = Math.max(nextThreshold - currentThreshold, 0);
    const progress = xpForNextLevel > 0 ? Math.min(xpIntoLevel / xpForNextLevel, 1) : 1;
    return {
        level,
        totalXp: xpState.total,
        xpIntoLevel,
        xpForNextLevel,
        progress,
    };
};

export const addExperience = (
    data: GamificationData,
    amount: number,
    source: GamificationXPSource,
    metadata?: Record<string, unknown>,
): XPUpdateResult => {
    const roundedAmount = Math.max(0, Math.round(amount));
    const previousLevel = data.xp.level;
    if (roundedAmount <= 0) {
        const progressInfo = getLevelProgressInfo(data.xp);
        return {
            amount: 0,
            total: data.xp.total,
            previousLevel,
            newLevel: previousLevel,
            xpIntoLevel: progressInfo.xpIntoLevel,
            xpForNextLevel: progressInfo.xpForNextLevel,
            progress: progressInfo.progress,
        };
    }

    data.xp.total += roundedAmount;
    data.xp.lastEarnedAt = new Date().toISOString();

    const { level, currentThreshold, nextThreshold } = resolveLevelFromXP(data.xp.total);
    const xpIntoLevel = data.xp.total - currentThreshold;
    const xpForNextLevel = Math.max(nextThreshold - currentThreshold, 0);
    data.xp.level = level;
    data.xp.levelProgress = xpForNextLevel > 0 ? Math.min(xpIntoLevel / xpForNextLevel, 1) : 1;

    data.xp.history = clampHistory(
        [
            ...data.xp.history,
            {
                id: createStorageId(),
                amount: roundedAmount,
                source,
                createdAt: new Date().toISOString(),
                metadata,
            },
        ],
        MAX_XP_HISTORY,
    );

    return {
        amount: roundedAmount,
        total: data.xp.total,
        previousLevel,
        newLevel: level,
        xpIntoLevel,
        xpForNextLevel,
        progress: data.xp.levelProgress,
    };
};

interface MissionTemplate {
    id: string;
    title: string;
    description: string;
    metric: MissionObjective['metric'];
    target: number;
    activity?: ActivityMode;
    goal?: LearningGoal;
    rewardXp: number;
}

const DAILY_MISSION_COUNT = 3;
const DAILY_MISSION_EXPIRY_HOURS = 24;

const MISSION_TEMPLATES: MissionTemplate[] = [
    {
        id: 'convo-streak',
        title: 'Gespreksstarter',
        description: 'Voer meerdere gesprekssessies voor extra oefening.',
        metric: 'sessions',
        target: 2,
        activity: 'conversation',
        rewardXp: 45,
    },
    {
        id: 'listening-focus',
        title: 'Luister scherp',
        description: 'Werk aan je luistervaardigheid.',
        metric: 'sessions',
        target: 1,
        activity: 'listen-summarize',
        rewardXp: 40,
    },
    {
        id: 'vocab-builder',
        title: 'Woordenbouwer',
        description: 'Focus op vocabulaire om je woordenschat uit te breiden.',
        metric: 'sessions',
        target: 1,
        activity: 'vocabulary',
        rewardXp: 35,
    },
    {
        id: 'creative-boost',
        title: 'Creatieve impuls',
        description: 'Probeer een creatieve workshop voor extra variatie.',
        metric: 'sessions',
        target: 1,
        activity: 'creative-improvisation',
        rewardXp: 50,
    },
    {
        id: 'goal-driven',
        title: 'Doelgericht',
        description: 'Voltooi een sessie met je huidige leerdoel.',
        metric: 'sessions',
        target: 1,
        rewardXp: 40,
    },
];

const createMissionFromTemplate = (template: MissionTemplate, level: CEFRLevel): MissionProgress => {
    const assignedAt = new Date();
    const expiresAt = new Date(assignedAt.getTime() + DAILY_MISSION_EXPIRY_HOURS * ONE_HOUR_MS);
    return {
        id: createStorageId(),
        title: template.title,
        description: template.description,
        level,
        activity: template.activity,
        goal: template.goal,
        status: 'active',
        assignedAt: assignedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        objectives: [
            {
                id: `${template.id}-objective`,
                description: template.description,
                metric: template.metric,
                progress: 0,
                target: template.target,
            },
        ],
        reward: {
            xp: template.rewardXp,
        },
    };
};

const filterExpiredMissions = (missions: MissionProgress[]): MissionProgress[] => {
    const now = Date.now();
    return missions.filter(mission => {
        if (mission.status === 'completed') {
            return true;
        }
        if (!mission.expiresAt) {
            return true;
        }
        return new Date(mission.expiresAt).getTime() > now;
    });
};

const pickMissionTemplates = (count: number): MissionTemplate[] => {
    const shuffled = [...MISSION_TEMPLATES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
};

export const ensureDailyMissions = (data: GamificationData, level: CEFRLevel): void => {
    data.missions = filterExpiredMissions(data.missions);
    const activeCount = data.missions.filter(mission => mission.status === 'active').length;
    if (activeCount >= DAILY_MISSION_COUNT) {
        return;
    }

    const needed = DAILY_MISSION_COUNT - activeCount;
    const templates = pickMissionTemplates(needed);
    templates.forEach(template => {
        data.missions.push(createMissionFromTemplate(template, level));
    });
};

export const applySessionToMissions = (
    data: GamificationData,
    session: {
        level: CEFRLevel;
        activity: ActivityMode;
        goal: LearningGoal;
    },
): MissionProgress[] => {
    const completed: MissionProgress[] = [];
    data.missions = data.missions.map(mission => {
        if (mission.status !== 'active') {
            return mission;
        }
        if (mission.expiresAt && new Date(mission.expiresAt).getTime() <= Date.now()) {
            return { ...mission, status: 'expired' as MissionProgress['status'] };
        }

        const matchesActivity = !mission.activity || mission.activity === session.activity;
        const matchesGoal = !mission.goal || mission.goal === session.goal;

        if (!matchesActivity || !matchesGoal) {
            return mission;
        }

        const updatedObjectives = mission.objectives.map(objective => {
            if (objective.metric === 'sessions') {
                const newProgress = Math.min(objective.target, objective.progress + 1);
                return { ...objective, progress: newProgress };
            }
            return objective;
        });

        const allComplete = updatedObjectives.every(objective => objective.progress >= objective.target);
        const updatedMission: MissionProgress = {
            ...mission,
            objectives: updatedObjectives,
        };

        if (allComplete) {
            updatedMission.status = 'completed';
            updatedMission.completedAt = new Date().toISOString();
            completed.push(updatedMission);
        }
        return updatedMission;
    });

    return completed;
};

interface BadgeEvaluationContext {
    level: number;
    totalSessions: number;
    dailyStreak: number;
    missionsCompleted: number;
}

interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    category: BadgeProgress['category'];
    hint?: string;
    isSecret?: boolean;
    condition: (context: BadgeEvaluationContext) => boolean;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
    {
        id: 'rookie',
        name: 'Eerste stap',
        description: 'Voltooi je eerste sessie met de tutor.',
        category: 'skill',
        condition: (context) => context.totalSessions >= 1,
    },
    {
        id: 'streak-7',
        name: 'Weekkampioen',
        description: 'Behaal een dagelijkse streak van 7 dagen.',
        category: 'consistency',
        condition: (context) => context.dailyStreak >= 7,
    },
    {
        id: 'level-5',
        name: 'Ervaren coach',
        description: 'Bereik coach level 5.',
        category: 'skill',
        condition: (context) => context.level >= 5,
    },
    {
        id: 'mission-ace',
        name: 'Missiespecialist',
        description: 'Rond je eerste dagmissie af.',
        category: 'special',
        condition: (context) => context.missionsCompleted >= 1,
    },
];

export const evaluateBadges = (data: GamificationData, context: BadgeEvaluationContext): BadgeProgress[] => {
    const unlocked = new Set(data.badges.map(badge => badge.id));
    const newlyUnlocked: BadgeProgress[] = [];

    BADGE_DEFINITIONS.forEach(definition => {
        if (unlocked.has(definition.id)) {
            return;
        }
        if (definition.condition(context)) {
            const badge: BadgeProgress = {
                id: definition.id,
                name: definition.name,
                description: definition.description,
                category: definition.category,
                unlockedAt: new Date().toISOString(),
                hint: definition.hint,
                isSecret: definition.isSecret,
            };
            data.badges.push(badge);
            newlyUnlocked.push(badge);
        }
    });

    return newlyUnlocked;
};

export const getBadgeCatalog = (data: GamificationData): BadgeProgress[] => {
    const unlockedMap = new Map(data.badges.map(badge => [badge.id, badge]));
    return BADGE_DEFINITIONS.map(definition => {
        const unlocked = unlockedMap.get(definition.id);
        if (unlocked) {
            return unlocked;
        }
        return {
            id: definition.id,
            name: definition.name,
            description: definition.description,
            category: definition.category,
            hint: definition.hint,
            isSecret: definition.isSecret,
        } as BadgeProgress;
    });
};

export const recordMinigameResult = (data: GamificationData, result: MinigameResult): void => {
    const entry: MinigameResult = {
        ...result,
        id: result.id ?? createStorageId(),
    };
    data.minigames = clampHistory([...data.minigames, entry], MAX_MINIGAME_HISTORY);
};

const getSeasonalWindow = (definition: SeasonalEventDefinition, reference: Date) => {
    const year = reference.getFullYear();
    let start = new Date(Date.UTC(year, definition.startMonth - 1, definition.startDay, 0, 0, 0, 0));
    let end = new Date(Date.UTC(year, definition.endMonth - 1, definition.endDay, 23, 59, 59, 999));
    if (end < start) {
        end.setFullYear(end.getFullYear() + 1);
    }
    if (reference > end) {
        start = new Date(Date.UTC(year + 1, definition.startMonth - 1, definition.startDay, 0, 0, 0, 0));
        end = new Date(Date.UTC(year + 1, definition.endMonth - 1, definition.endDay, 23, 59, 59, 999));
        if (end < start) {
            end.setFullYear(end.getFullYear() + 1);
        }
    }
    return { start, end };
};

export const ensureSeasonalEvents = (data: GamificationData): void => {
    const now = new Date();
    if (!Array.isArray(data.seasonalEvents)) {
        data.seasonalEvents = [];
    }

    SEASONAL_EVENT_DEFINITIONS.forEach(definition => {
        const { start, end } = getSeasonalWindow(definition, now);
        const existingIndex = data.seasonalEvents.findIndex(event => event.id === definition.id);
        const targetSessions = definition.targetSessions ?? DEFAULT_SEASONAL_TARGET_SESSIONS;
        const status = now < start ? 'upcoming' : now > end ? 'completed' : 'active';
        if (existingIndex === -1) {
            data.seasonalEvents.push({
                id: definition.id,
                name: definition.name,
                description: definition.description,
                theme: definition.theme,
                startsAt: start.toISOString(),
                endsAt: end.toISOString(),
                status,
                progress: status === 'completed' ? targetSessions : 0,
                rewards: {
                    xp: definition.rewardXp,
                },
                metadata: {
                    targetSessions,
                    focusActivity: definition.focusActivity,
                },
            });
        } else {
            const event = data.seasonalEvents[existingIndex];
            event.name = definition.name;
            event.description = definition.description;
            event.theme = definition.theme;
            event.startsAt = start.toISOString();
            event.endsAt = end.toISOString();
            event.metadata = {
                ...event.metadata,
                targetSessions,
                focusActivity: definition.focusActivity,
            };
            if (event.status !== 'completed') {
                event.status = status;
            }
        }
    });
};

export const applySeasonalProgress = (
    data: GamificationData,
    session: { level: CEFRLevel; activity: ActivityMode; goal: LearningGoal },
): SeasonalEventProgress[] => {
    const now = new Date();
    ensureSeasonalEvents(data);
    const completed: SeasonalEventProgress[] = [];
    const definitions = new Map(SEASONAL_EVENT_DEFINITIONS.map(def => [def.id, def]));

    data.seasonalEvents = data.seasonalEvents.map(event => {
        const definition = definitions.get(event.id);
        if (!definition) {
            return event;
        }
        const { start, end } = getSeasonalWindow(definition, now);
        const targetSessions = Number(event.metadata?.targetSessions ?? definition.targetSessions ?? DEFAULT_SEASONAL_TARGET_SESSIONS);
        const matchesActivity = !definition.focusActivity || definition.focusActivity === session.activity;
        const wasCompleted = event.status === 'completed';

        event.startsAt = start.toISOString();
        event.endsAt = end.toISOString();

        if (now < start) {
            event.status = 'upcoming';
        } else if (now > end) {
            event.status = 'completed';
        } else if (event.status !== 'completed') {
            event.status = 'active';
        }

        if (event.status === 'active' && matchesActivity) {
            event.progress = (event.progress ?? 0) + 1;
        }

        if ((event.progress ?? 0) >= targetSessions) {
            event.status = 'completed';
            event.progress = targetSessions;
        }

        if (!wasCompleted && event.status === 'completed') {
            completed.push({ ...event });
        }

        return event;
    });

    return completed;
};

export function loadGamificationData(): GamificationData {
    if (!isBrowserEnvironment) {
        return createDefaultGamificationData();
    }
    try {
        const storedValue = window.localStorage.getItem(GAMIFICATION_STORAGE_KEY);
        if (!storedValue) {
            return createDefaultGamificationData();
        }
        const parsed = JSON.parse(storedValue) as Partial<GamificationData>;
        return ensureGamificationData(parsed);
    } catch (error) {
        console.error('Kon gamificationdata niet laden, gebruik standaardwaarden.', error);
        return createDefaultGamificationData();
    }
}

export function saveGamificationData(data: GamificationData): void {
    if (!isBrowserEnvironment) {
        return;
    }
    try {
        const payload = {
            ...data,
            version: GAMIFICATION_DATA_VERSION,
            lastSyncedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
        console.error('Kon gamificationdata niet opslaan.', error);
    }
}

export const resetGamificationData = (): GamificationData => {
    const defaults = createDefaultGamificationData();
    saveGamificationData(defaults);
    return defaults;
};


