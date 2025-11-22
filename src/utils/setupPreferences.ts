import {
    DEFAULT_FEEDBACK_STRICTNESS,
    FEEDBACK_ASPECTS,
    LEARNING_GOALS,
    type FeedbackStrictnessSettings,
    type LearningGoal,
    type StrictnessLevel,
} from '@/types';

const STORAGE_KEY = 'setupPreferences:v1';
const DEFAULT_GOALS: LearningGoal[] = ['fluency'];

export interface SetupPreferences {
    goals: LearningGoal[];
    strictness: FeedbackStrictnessSettings;
    onboardingCompleted: boolean;
    collapsed: boolean;
    updatedAt: number;
}

const isBrowserEnvironment = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const createDefaultPreferences = (): SetupPreferences => ({
    goals: [...DEFAULT_GOALS],
    strictness: { ...DEFAULT_FEEDBACK_STRICTNESS },
    onboardingCompleted: false,
    collapsed: false,
    updatedAt: Date.now(),
});

const sanitizeGoals = (value: unknown): LearningGoal[] => {
    if (!Array.isArray(value)) {
        return [...DEFAULT_GOALS];
    }
    const allowed = new Set<LearningGoal>(LEARNING_GOALS as ReadonlyArray<LearningGoal>);
    const unique: LearningGoal[] = [];

    value.forEach(item => {
        if (typeof item !== 'string') {
            return;
        }
        if (!allowed.has(item as LearningGoal)) {
            return;
        }
        if (!unique.includes(item as LearningGoal)) {
            unique.push(item as LearningGoal);
        }
    });

    return unique.length > 0 ? unique : [...DEFAULT_GOALS];
};

const clampStrictnessLevel = (value: number): StrictnessLevel => {
    const rounded = Math.round(value);
    const clamped = Math.min(5, Math.max(1, rounded)) as StrictnessLevel;
    return clamped;
};

const sanitizeStrictness = (value: unknown): FeedbackStrictnessSettings => {
    const baseline: FeedbackStrictnessSettings = { ...DEFAULT_FEEDBACK_STRICTNESS };
    if (!value || typeof value !== 'object') {
        return baseline;
    }
    FEEDBACK_ASPECTS.forEach(aspect => {
        const raw = (value as Record<string, unknown>)[aspect];
        if (typeof raw === 'number' && Number.isFinite(raw)) {
            baseline[aspect] = clampStrictnessLevel(raw);
        }
    });
    return baseline;
};

export const loadSetupPreferences = (): SetupPreferences => {
    if (!isBrowserEnvironment) {
        return createDefaultPreferences();
    }

    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return createDefaultPreferences();
        }

        const parsed = JSON.parse(stored) as Partial<SetupPreferences> & {
            goals?: unknown;
            strictness?: unknown;
        };

        return {
            goals: sanitizeGoals(parsed.goals),
            strictness: sanitizeStrictness(parsed.strictness),
            onboardingCompleted: Boolean(parsed.onboardingCompleted),
            collapsed: typeof parsed.collapsed === 'boolean' ? parsed.collapsed : false,
            updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
        };
    } catch (error) {
        console.warn('Kon setupvoorkeuren niet laden uit localStorage:', error);
        return createDefaultPreferences();
    }
};

export const saveSetupPreferences = (patch: Partial<SetupPreferences>): void => {
    if (!isBrowserEnvironment) {
        return;
    }

    try {
        const current = loadSetupPreferences();
        const next: SetupPreferences = {
            goals: sanitizeGoals(patch.goals ?? current.goals),
            strictness: sanitizeStrictness(patch.strictness ?? current.strictness),
            onboardingCompleted: patch.onboardingCompleted ?? current.onboardingCompleted,
            collapsed: typeof patch.collapsed === 'boolean' ? patch.collapsed : current.collapsed,
            updatedAt: patch.updatedAt ?? Date.now(),
        };

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
        console.warn('Kon setupvoorkeuren niet opslaan in localStorage:', error);
    }
};

export const clearSetupPreferences = (): void => {
    if (!isBrowserEnvironment) {
        return;
    }

    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.warn('Kon setupvoorkeuren niet verwijderen uit localStorage:', error);
    }
};


