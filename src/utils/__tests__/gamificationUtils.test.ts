import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import {
    createDefaultGamificationData,
    applySessionStreakUpdate,
    addExperience,
    ensureDailyMissions,
    applySessionToMissions,
    evaluateBadges,
    recordMinigameResult,
    ensureSeasonalEvents,
    applySeasonalProgress,
} from '../gamificationUtils';
import type {
    GamificationData,
    MissionProgress,
    SeasonalEventProgress,
    CEFRLevel,
    ActivityMode,
    LearningGoal,
} from '../../types';

const asUTCDate = (value: string) => new Date(value);

const createMission = (overrides: Partial<MissionProgress> = {}): MissionProgress => ({
    id: overrides.id ?? 'mission-1',
    title: overrides.title ?? 'Test missie',
    description: overrides.description ?? 'Voer één sessie uit',
    level: overrides.level ?? ('A1' as CEFRLevel),
    activity: overrides.activity,
    goal: overrides.goal,
    status: overrides.status ?? 'active',
    assignedAt: overrides.assignedAt ?? new Date().toISOString(),
    expiresAt: overrides.expiresAt,
    objectives:
        overrides.objectives ??
        [
            {
                id: 'objective-1',
                description: 'Voltooi een sessie',
                metric: 'sessions',
                progress: 0,
                target: 1,
            },
        ],
    reward: overrides.reward ?? { xp: 25 },
    completedAt: overrides.completedAt,
});

const createSessionContext = (activity: ActivityMode, goal: LearningGoal) => ({
    level: 'A1' as CEFRLevel,
    activity,
    goal,
});

describe('gamificationUtils', () => {
    beforeEach(() => {
        vi.useRealTimers();
        localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it('verhoogt dagelijkse streaks en ontgrendelt een mijlpaal na zeven dagen', () => {
    let data: GamificationData | undefined;
    let summary;
    const streakProgress: number[] = [];

    for (let day = 0; day < 7; day += 1) {
        const sessionDate = new Date(2024, 0, 1 + day, 9, 0, 0);
        const result = applySessionStreakUpdate(sessionDate);
        data = result.data;
        streakProgress.push(result.data.streaks.daily.current);
        if (day === 6) {
            summary = result.summary;
        }
    }

    expect(data).toBeDefined();
    if (!data) {
        throw new Error('Gamificationdata ontbreekt na streaktest.');
    }
    expect(streakProgress).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(data.streaks.daily.current).toBe(7);
        expect(summary?.milestonesUnlocked).toHaveLength(1);
        expect(summary?.milestonesUnlocked?.[0].value).toBe(7);
        expect(summary?.deadlines).toHaveLength(2);
    });

    it('voegt ervaring toe en verhoogt het level bij voldoende XP', () => {
    const data = createDefaultGamificationData();
        const result = addExperience(data, 300, 'session');

        expect(result.amount).toBe(300);
        expect(result.newLevel).toBeGreaterThan(result.previousLevel);
        expect(data.xp.total).toBe(300);
        expect(data.xp.level).toBe(result.newLevel);
    });

    it('zorgt dat er altijd drie actieve missies beschikbaar zijn', () => {
        const data = createDefaultGamificationData();
        ensureDailyMissions(data, 'A2');

        const initialActive = data.missions.filter(mission => mission.status === 'active');
        expect(initialActive).toHaveLength(3);

        // Markeer één missie als voltooid en een andere als verlopen
        data.missions[0].status = 'completed';
        data.missions[1].expiresAt = new Date(Date.now() - 1000).toISOString();

        ensureDailyMissions(data, 'A2');
        const activeAfterRefresh = data.missions.filter(mission => mission.status === 'active');
        expect(activeAfterRefresh.length).toBe(3);
    });

    it('werkt missies bij op basis van sessies en markeert ze als voltooid', () => {
        const data = createDefaultGamificationData();
        const mission = createMission({
            activity: 'conversation',
            goal: 'fluency',
        });
        data.missions = [mission];

        const completed = applySessionToMissions(data, createSessionContext('conversation', 'fluency'));

        expect(completed).toHaveLength(1);
        expect(data.missions[0].status).toBe('completed');
        expect(data.missions[0].objectives[0].progress).toBe(1);
    });

    it('evalueert badges op basis van de voortgang en voorkomt duplicaten', () => {
        const data = createDefaultGamificationData();
        const context = {
            level: 6,
            totalSessions: 5,
            dailyStreak: 10,
            missionsCompleted: 3,
        };

        const firstUnlock = evaluateBadges(data, context);
        expect(firstUnlock.map(badge => badge.id)).toEqual(
            expect.arrayContaining(['rookie', 'streak-7', 'level-5', 'mission-ace']),
        );
        expect(firstUnlock.length).toBeGreaterThan(0);

        const secondUnlock = evaluateBadges(data, context);
        expect(secondUnlock).toHaveLength(0);
        expect(data.badges.length).toBe(firstUnlock.length);
    });

    it('begrensd minigamegeschiedenis op vijftig items en bewaart recentste resultaten', () => {
        const data = createDefaultGamificationData();
        const now = new Date().toISOString();

        for (let index = 0; index < 55; index += 1) {
            recordMinigameResult(data, {
                id: `game-${index}`,
                type: 'vocab-quiz',
                score: index,
                maxScore: 10,
                playedAt: now,
            });
        }

        expect(data.minigames).toHaveLength(50);
        expect(data.minigames[0].id).toBe('game-5');
        expect(data.minigames[49].id).toBe('game-54');
    });

    it('beheert seizoensevents afhankelijk van de datum en rondt ze af bij voldoende sessies', () => {
    vi.setSystemTime(asUTCDate('2024-03-10T12:00:00Z'));
        const data = createDefaultGamificationData();

        ensureSeasonalEvents(data);

        const springEvent = data.seasonalEvents.find(event => event.id === 'spring-conversations');
        const winterEvent = data.seasonalEvents.find(event => event.id === 'winter-storytelling');

    expect(springEvent?.status).toBe('active');
    expect(winterEvent?.status).toBe('upcoming');

        vi.setSystemTime(asUTCDate('2024-12-10T12:00:00Z'));
        const completions: SeasonalEventProgress[] = [];

        for (let session = 0; session < 5; session += 1) {
            const result = applySeasonalProgress(data, {
                level: 'A2',
                activity: 'creative-story-relay',
                goal: 'fluency',
            });
            if (result.length) {
                completions.push(...result);
            }
        }

        const winterCompletion = completions.find(event => event.id === 'winter-storytelling');
        expect(winterCompletion).toBeDefined();
        const updatedWinter = data.seasonalEvents.find(event => event.id === 'winter-storytelling');
        expect(updatedWinter?.status).toBe('completed');
        expect(updatedWinter?.progress).toBeGreaterThan(0);
        vi.useRealTimers();
    });
});


