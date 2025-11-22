import type { UserProfile } from '@/types/userProfile';
import { DEFAULT_USER_PROFILE } from '@/types/userProfile';
import { loadGamificationState } from './gamification';
import { loadSRSItems } from './spacedRepetition';
import { loadPlacementResult } from './placementTest';
import { identifyWeakPoints } from './adaptiveLearning';

const STORAGE_KEY = 'user_profile';

/**
 * Laad user profile
 */
export function loadUserProfile(): UserProfile {
    if (typeof window === 'undefined') {
        return DEFAULT_USER_PROFILE;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return createDefaultProfile();
        }

        const profile = JSON.parse(stored) as UserProfile;
        
        // Merge met actuele data uit andere services
        return {
            ...profile,
            gamification: loadGamificationState(),
            srsItems: loadSRSItems(),
            placementTestResult: loadPlacementResult() || profile.placementTestResult,
            weakPoints: identifyWeakPoints(),
        };
    } catch (error) {
        console.error('Failed to load user profile:', error);
        return createDefaultProfile();
    }
}

/**
 * Sla user profile op
 */
export function saveUserProfile(profile: UserProfile): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
        console.error('Failed to save user profile:', error);
    }
}

/**
 * Maak default profile
 */
function createDefaultProfile(): UserProfile {
    return {
        ...DEFAULT_USER_PROFILE,
        gamification: loadGamificationState(),
        srsItems: loadSRSItems(),
        placementTestResult: loadPlacementResult(),
        weakPoints: identifyWeakPoints(),
    };
}

/**
 * Update statistics na oefening voltooiing
 */
export function updateStatistics(
    profile: UserProfile,
    exerciseId: string,
    score: number,
    timeSpent: number // Minuten
): UserProfile {
    const newTotalExercises = profile.statistics.totalExercisesCompleted + 1;
    const newTotalTime = profile.statistics.totalTimeSpent + timeSpent;
    const newAverageScore = ((profile.statistics.averageScore * profile.statistics.totalExercisesCompleted) + score) / newTotalExercises;

    const category = exerciseId.split('-')[0] || 'other';
    const newCategoryCount = {
        ...profile.statistics.exercisesByCategory,
        [category]: (profile.statistics.exercisesByCategory[category] || 0) + 1,
    };

    return {
        ...profile,
        statistics: {
            ...profile.statistics,
            totalExercisesCompleted: newTotalExercises,
            totalTimeSpent: newTotalTime,
            averageScore: Math.round(newAverageScore),
            exercisesByCategory: newCategoryCount,
            lastActivityDate: Date.now(),
        },
    };
}

/**
 * Update preferences
 */
export function updatePreferences(
    profile: UserProfile,
    preferences: Partial<UserProfile['preferences']>
): UserProfile {
    return {
        ...profile,
        preferences: {
            ...profile.preferences,
            ...preferences,
        },
    };
}

