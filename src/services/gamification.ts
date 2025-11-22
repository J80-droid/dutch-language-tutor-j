import type { Badge, Achievement, StreakData, GamificationState } from '@/types/gamification';
import { BADGE_DEFINITIONS, ACHIEVEMENT_DEFINITIONS } from '@/types/gamification';

const STORAGE_KEY = 'gamification_state';

/**
 * Laad gamification state
 */
export function loadGamificationState(): GamificationState {
    if (typeof window === 'undefined') {
        return getDefaultState();
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return getDefaultState();
        return JSON.parse(stored) as GamificationState;
    } catch (error) {
        console.error('Failed to load gamification state:', error);
        return getDefaultState();
    }
}

/**
 * Sla gamification state op
 */
export function saveGamificationState(state: GamificationState): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save gamification state:', error);
    }
}

/**
 * Get default state
 */
function getDefaultState(): GamificationState {
    return {
        badges: [],
        achievements: [],
        streak: {
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: 0,
        },
        totalPoints: 0,
        level: 1,
    };
}

/**
 * Update streak na activiteit
 */
export function updateStreak(state: GamificationState): GamificationState {
    const now = Date.now();
    const today = new Date(now).setHours(0, 0, 0, 0);
    const lastActivity = state.streak.lastActivityDate;
    const lastActivityDay = lastActivity ? new Date(lastActivity).setHours(0, 0, 0, 0) : 0;

    let newStreak = state.streak.currentStreak;
    const daysDiff = (today - lastActivityDay) / (24 * 60 * 60 * 1000);

    if (daysDiff === 0) {
        // Al vandaag geoefend, geen update nodig
        return state;
    } else if (daysDiff === 1) {
        // Consecutive day
        newStreak = state.streak.currentStreak + 1;
    } else {
        // Streak gebroken
        newStreak = 1;
    }

    const updatedStreak: StreakData = {
        currentStreak: newStreak,
        longestStreak: Math.max(state.streak.longestStreak, newStreak),
        lastActivityDate: now,
    };

    return {
        ...state,
        streak: updatedStreak,
    };
}

/**
 * Check en unlock badges
 */
export function checkBadges(state: GamificationState): { state: GamificationState; newBadges: Badge[] } {
    const newBadges: Badge[] = [];
    const unlockedBadgeIds = new Set(state.badges.map(b => b.id));

    BADGE_DEFINITIONS.forEach(badgeDef => {
        if (unlockedBadgeIds.has(badgeDef.id)) return;

        let shouldUnlock = false;

        // Check voorwaarden
        switch (badgeDef.id) {
            case 'week-streak':
                shouldUnlock = state.streak.currentStreak >= 7;
                break;
            case 'month-streak':
                shouldUnlock = state.streak.currentStreak >= 30;
                break;
            case 'perfect-score':
                // Wordt gecheckt bij oefening voltooiing
                break;
            // Voeg meer checks toe op basis van state
        }

        if (shouldUnlock) {
            const badge: Badge = {
                ...badgeDef,
                unlockedAt: Date.now(),
            };
            newBadges.push(badge);
            unlockedBadgeIds.add(badge.id);
        }
    });

    if (newBadges.length > 0) {
        return {
            state: {
                ...state,
                badges: [...state.badges, ...newBadges],
            },
            newBadges,
        };
    }

    return { state, newBadges: [] };
}

/**
 * Check en unlock achievements
 */
export function checkAchievements(
    state: GamificationState,
    exerciseCount: number,
    averageScore: number
): { state: GamificationState; newAchievements: Achievement[] } {
    const newAchievements: Achievement[] = [];
    const unlockedAchievementIds = new Set(state.achievements.map(a => a.id));

    ACHIEVEMENT_DEFINITIONS.forEach(achievementDef => {
        if (unlockedAchievementIds.has(achievementDef.id)) return;

        let shouldUnlock = false;

        switch (achievementDef.type) {
            case 'exercises':
                shouldUnlock = exerciseCount >= achievementDef.requirement;
                break;
            case 'streak':
                shouldUnlock = state.streak.currentStreak >= achievementDef.requirement;
                break;
            case 'score':
                shouldUnlock = averageScore >= achievementDef.requirement;
                break;
        }

        if (shouldUnlock) {
            const achievement: Achievement = {
                ...achievementDef,
                unlockedAt: Date.now(),
            };
            newAchievements.push(achievement);
            unlockedAchievementIds.add(achievement.id);
        }
    });

    if (newAchievements.length > 0) {
        return {
            state: {
                ...state,
                achievements: [...state.achievements, ...newAchievements],
            },
            newAchievements,
        };
    }

    return { state, newAchievements: [] };
}

/**
 * Bereken level op basis van punten
 */
export function calculateLevel(points: number): number {
    // Level = sqrt(points / 100) + 1
    return Math.floor(Math.sqrt(points / 100)) + 1;
}

/**
 * Voeg punten toe
 */
export function addPoints(state: GamificationState, points: number): GamificationState {
    const newTotalPoints = state.totalPoints + points;
    const newLevel = calculateLevel(newTotalPoints);

    return {
        ...state,
        totalPoints: newTotalPoints,
        level: newLevel,
    };
}

