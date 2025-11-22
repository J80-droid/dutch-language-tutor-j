
import {
  ProgressData,
  CEFRLevel,
  ActivityMode,
  StreakUpdateSummary,
  CEFR_SKILLS,
  CEFRSkill,
  CEFR_LEVELS,
} from '../types';
import { applySessionStreakUpdate } from './gamificationUtils';
import { getActivityOutcomes } from '@/data/activityOutcomes';

const PROGRESS_KEY = 'userProgress';
const SKILL_EXPOSURE_TARGET = 12;

export interface ProgressUpdateResult {
  progress: ProgressData;
  streakSummary: StreakUpdateSummary;
}

export interface MasterySnapshot {
  overall: number;
  skills: Record<CEFRSkill, number>;
}

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

const ensureMasteryLevel = (progress: ProgressData, level: CEFRLevel) => {
  if (!progress.mastery) {
    progress.mastery = {};
  }
  if (!progress.mastery[level]) {
    progress.mastery[level] = {
      skills: Object.fromEntries(
        CEFR_SKILLS.map(skill => [skill, { exposure: 0 }]),
      ) as ProgressData['mastery'][CEFRLevel]['skills'],
    };
  } else {
    CEFR_SKILLS.forEach(skill => {
      if (!progress.mastery![level]!.skills[skill]) {
        progress.mastery![level]!.skills[skill] = { exposure: 0 };
      }
    });
  }
  return progress.mastery[level]!;
};

const applyMasteryUpdate = (progress: ProgressData, mode: ActivityMode) => {
  const outcomes = getActivityOutcomes(mode);
  if (outcomes.length === 0) {
    return;
  }

  outcomes.forEach(outcome => {
    const masteryLevel = ensureMasteryLevel(progress, outcome.level);
    const increment = outcome.weight ?? 1;
    outcome.skills.forEach(skill => {
      const entry = masteryLevel.skills[skill];
      entry.exposure = clamp(entry.exposure + increment, 0, SKILL_EXPOSURE_TARGET);
    });
  });
};

export const calculateMasterySnapshot = (progress: ProgressData): Record<CEFRLevel, MasterySnapshot> => {
  const snapshot: Partial<Record<CEFRLevel, MasterySnapshot>> = {};
  if (!progress.mastery) {
    return snapshot as Record<CEFRLevel, MasterySnapshot>;
  }

  CEFR_LEVELS.forEach(level => {
    const mastery = progress.mastery?.[level];
    if (!mastery) {
      return;
    }
    const skillsPercent: Record<CEFRSkill, number> = {} as Record<CEFRSkill, number>;
    let total = 0;
    let count = 0;
    CEFR_SKILLS.forEach(skill => {
      const exposure = mastery.skills[skill]?.exposure ?? 0;
      const percent = clamp((exposure / SKILL_EXPOSURE_TARGET) * 100);
      skillsPercent[skill] = percent;
      total += percent;
      count += 1;
    });
    snapshot[level] = {
      overall: count ? total / count : 0,
      skills: skillsPercent,
    };
  });

  return snapshot as Record<CEFRLevel, MasterySnapshot>;
};

export const getProgress = (): ProgressData => {
  try {
    const progressJson = localStorage.getItem(PROGRESS_KEY);
    const parsed: ProgressData = progressJson ? JSON.parse(progressJson) : {};
    if (!Array.isArray(parsed.streakMilestonesUnlocked)) {
      parsed.streakMilestonesUnlocked = [];
    }
    return parsed;
  } catch (error) {
    console.error('Failed to parse user progress:', error);
    return {};
  }
};

export const updateProgress = (level: CEFRLevel, mode: ActivityMode): ProgressUpdateResult => {
  const progress = getProgress();
  const sessionDate = new Date();
  const today = sessionDate.toISOString().split('T')[0];
  
  if (!progress.stats) {
    progress.stats = {};
  }
  if (!progress.stats[level]) {
    progress.stats[level] = {};
  }
  if (!progress.stats[level]![mode]) {
    progress.stats[level]![mode] = 0;
  }
  progress.stats[level]![mode]! += 1;

  applyMasteryUpdate(progress, mode);

  const { summary: streakSummary } = applySessionStreakUpdate(sessionDate);

  progress.lastSessionDate = today;
  progress.currentStreak = streakSummary.daily.current;
  progress.longestStreak = streakSummary.daily.longest;
  progress.lastWeeklySessionDate = streakSummary.weekly.lastCompletedDate;
  progress.currentWeeklyStreak = streakSummary.weekly.current;
  progress.longestWeeklyStreak = streakSummary.weekly.longest;

  if (streakSummary.milestonesUnlocked.length) {
    const existing = new Set(progress.streakMilestonesUnlocked ?? []);
    streakSummary.milestonesUnlocked
      .filter(item => item.period === 'daily')
      .forEach(item => {
        existing.add(item.value);
      });
    progress.streakMilestonesUnlocked = Array.from(existing).sort((a, b) => a - b);
  }

  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  return { progress, streakSummary };
};
