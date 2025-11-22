import type { CEFRLevel } from '@/types';
import type { ExtraExerciseId } from '@/data/extraExercises';

export interface WeakPoint {
    topic: string;
    exerciseId: ExtraExerciseId;
    errorRate: number; // 0-1
    lastPracticed?: number;
    priority: number; // Higher = more important to practice
}

export interface AdaptiveRecommendation {
    exerciseId: ExtraExerciseId;
    reason: string;
    priority: number;
}

export interface PerformanceData {
    exerciseId: ExtraExerciseId;
    attempts: number;
    correctAnswers: number;
    lastAttempt?: number;
    averageScore: number; // 0-100
}

/**
 * Track performance voor een oefening
 */
export function recordPerformance(
    exerciseId: ExtraExerciseId,
    score: number,
    totalQuestions: number
): void {
    if (typeof window === 'undefined') return;

    try {
        const key = `performance_${exerciseId}`;
        const stored = localStorage.getItem(key);
        const existing: PerformanceData = stored 
            ? JSON.parse(stored)
            : {
                exerciseId,
                attempts: 0,
                correctAnswers: 0,
                averageScore: 0,
            };

        const newAttempts = existing.attempts + 1;
        const newCorrectAnswers = existing.correctAnswers + (score / 100) * totalQuestions;
        const newAverageScore = ((existing.averageScore * existing.attempts) + score) / newAttempts;

        const updated: PerformanceData = {
            ...existing,
            attempts: newAttempts,
            correctAnswers: newCorrectAnswers,
            averageScore: newAverageScore,
            lastAttempt: Date.now(),
        };

        localStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
        console.error('Failed to record performance:', error);
    }
}

/**
 * Identificeer zwakke punten
 */
export function identifyWeakPoints(): WeakPoint[] {
    if (typeof window === 'undefined') return [];

    const weakPoints: WeakPoint[] = [];
    const exerciseIds: ExtraExerciseId[] = [];

    // Haal alle performance data op
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('performance_')) {
            const exerciseId = key.replace('performance_', '') as ExtraExerciseId;
            exerciseIds.push(exerciseId);
        }
    }

    exerciseIds.forEach(exerciseId => {
        try {
            const stored = localStorage.getItem(`performance_${exerciseId}`);
            if (!stored) return;

            const data: PerformanceData = JSON.parse(stored);
            const errorRate = 1 - (data.averageScore / 100);

            // Alleen zwakke punten (error rate > 0.3 of score < 70%)
            if (errorRate > 0.3 || data.averageScore < 70) {
                const daysSincePractice = data.lastAttempt
                    ? (Date.now() - data.lastAttempt) / (24 * 60 * 60 * 1000)
                    : Infinity;

                weakPoints.push({
                    topic: exerciseId,
                    exerciseId,
                    errorRate,
                    lastPracticed: data.lastAttempt,
                    priority: errorRate * 100 + (daysSincePractice > 7 ? 20 : 0), // Boost priority if not practiced recently
                });
            }
        } catch (error) {
            console.error(`Failed to process performance data for ${exerciseId}:`, error);
        }
    });

    // Sorteer op priority (hoogste eerst)
    return weakPoints.sort((a, b) => b.priority - a.priority);
}

/**
 * Genereer adaptieve aanbevelingen
 */
export function generateRecommendations(
    userLevel: CEFRLevel,
    limit: number = 5
): AdaptiveRecommendation[] {
    const weakPoints = identifyWeakPoints();
    const recommendations: AdaptiveRecommendation[] = [];

    weakPoints.slice(0, limit).forEach(weakPoint => {
        recommendations.push({
            exerciseId: weakPoint.exerciseId,
            reason: weakPoint.errorRate > 0.5
                ? 'Je hebt moeite met dit onderwerp. Extra oefening wordt aanbevolen.'
                : 'Oefen dit onderwerp om je vaardigheden te verbeteren.',
            priority: weakPoint.priority,
        });
    });

    return recommendations;
}

/**
 * Laad performance data voor een specifieke oefening
 */
export function getPerformanceData(exerciseId: ExtraExerciseId): PerformanceData | null {
    if (typeof window === 'undefined') return null;

    try {
        const stored = localStorage.getItem(`performance_${exerciseId}`);
        if (!stored) return null;
        return JSON.parse(stored) as PerformanceData;
    } catch (error) {
        console.error('Failed to load performance data:', error);
        return null;
    }
}

