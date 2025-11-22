import type { ActivityMode, CreativeActivityMode, LearningGoal } from '../../../../types';

export const DEFAULT_ACTIVITY_GOALS: Partial<Record<ActivityMode, LearningGoal>> = {
    conversation: 'fluency',
    vocabulary: 'vocabulary',
    'listen-summarize': 'listening',
    'creative-improvisation': 'fluency',
    'creative-story-relay': 'fluency',
    'creative-escape-room': 'vocabulary',
    'creative-emotion-barometer': 'fluency',
    'creative-keyword-wheel': 'vocabulary',
    'extra-practice': 'fluency',
};

export const GOAL_ENABLED_ACTIVITIES: ActivityMode[] = ['conversation'];

export const isCreativeActivity = (mode: ActivityMode): mode is CreativeActivityMode =>
    typeof mode === 'string' && mode.startsWith('creative-');

export const ACTIVITY_XP_WEIGHTS: Partial<Record<ActivityMode, number>> = {
    conversation: 28,
    vocabulary: 24,
    grammar: 22,
    culture: 20,
    'job-interview': 32,
    'making-complaint': 30,
    'expressing-opinion': 28,
    'giving-instructions': 26,
    'listen-summarize': 27,
    'tongue-twisters': 24,
    'sentence-puzzle': 24,
    'proverbs-sayings': 22,
    'extra-practice': 24,
};

export const GOAL_XP_BONUS: Record<LearningGoal, number> = {
    fluency: 18,
    vocabulary: 16,
    listening: 16,
    pronunciation: 14,
    'grammar-accuracy': 14,
    confidence: 12,
    'interaction-strategies': 14,
    'cultural-awareness': 12,
    'exam-prep': 20,
    'business-dutch': 18,
};

export const BASE_SESSION_XP = 35;
export const XP_PER_MINUTE = 6;
export const MAX_DURATION_BONUS = 200;
export const BALANCE_HIGH_BONUS = 25;
export const BALANCE_MEDIUM_BONUS = 15;
export const BALANCE_BASE_BONUS = 5;
export const STREAK_MILESTONE_XP = 30;
export const MINIGAME_XP_BASE = 30;

