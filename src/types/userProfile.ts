import type { CEFRLevel } from '@/types';
import type { PlacementTestResult } from '@/services/placementTest';
import type { WeakPoint } from '@/services/adaptiveLearning';
import type { GamificationState } from '@/types/gamification';
import type { SRSItem } from '@/services/spacedRepetition';
import type { LearningPath } from '@/services/learningPaths';

export interface UserProfile {
    // Placement test
    placementTestResult?: PlacementTestResult;
    currentLevel: CEFRLevel;
    
    // Weak points tracking
    weakPoints: WeakPoint[];
    
    // Gamification
    gamification: GamificationState;
    
    // SRS
    srsItems: SRSItem[];
    
    // Learning paths
    activeLearningPaths: LearningPath[];
    
    // Statistics
    statistics: {
        totalExercisesCompleted: number;
        totalTimeSpent: number; // Minuten
        averageScore: number; // 0-100
        exercisesByCategory: Record<string, number>;
        lastActivityDate: number;
    };
    
    // Preferences
    preferences: {
        preferredExerciseTypes: string[];
        dailyGoal: number; // Aantal oefeningen per dag
        reminderEnabled: boolean;
    };
}

export const DEFAULT_USER_PROFILE: UserProfile = {
    currentLevel: 'A1',
    weakPoints: [],
    gamification: {
        badges: [],
        achievements: [],
        streak: {
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: 0,
        },
        totalPoints: 0,
        level: 1,
    },
    srsItems: [],
    activeLearningPaths: [],
    statistics: {
        totalExercisesCompleted: 0,
        totalTimeSpent: 0,
        averageScore: 0,
        exercisesByCategory: {},
        lastActivityDate: Date.now(),
    },
    preferences: {
        preferredExerciseTypes: [],
        dailyGoal: 5,
        reminderEnabled: false,
    },
};

