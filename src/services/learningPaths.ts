import type { ExtraExerciseId } from '@/data/extraExercises';
import type { CEFRLevel } from '@/types';

export interface LearningPathStep {
    id: string;
    title: string;
    description: string;
    exerciseIds: ExtraExerciseId[];
    completed: boolean;
    completedAt?: number;
}

export interface LearningPath {
    id: string;
    name: string;
    description: string;
    targetLevel: CEFRLevel;
    steps: LearningPathStep[];
    startedAt?: number;
    completedAt?: number;
}

export const LEARNING_PATHS: LearningPath[] = [
    {
        id: 'inburgering-writing',
        name: 'Inburgeringsexamen Schrijfvaardigheid',
        description: 'Voorbereiding op het schrijfgedeelte van het inburgeringsexamen',
        targetLevel: 'B1',
        steps: [
            {
                id: 'step-1',
                title: 'Basis Grammatica',
                description: 'Leer de fundamenten van Nederlandse grammatica',
                exerciseIds: ['de-het-contextual', 'plural-forms', 'prepositions'],
                completed: false,
            },
            {
                id: 'step-2',
                title: 'Zinsbouw en Woordvolgorde',
                description: 'Oefen met correcte zinsbouw',
                exerciseIds: ['sentence-jigsaw', 'inversion-practice', 'subordinate-clause-sov'],
                completed: false,
            },
            {
                id: 'step-3',
                title: 'Werkwoordstijden',
                description: 'Beheers perfectum en imperfectum',
                exerciseIds: ['perfectum-practice', 'imperfectum-practice'],
                completed: false,
            },
            {
                id: 'step-4',
                title: 'Formeel Schrijven',
                description: 'Leer formele taal voor officiële documenten',
                exerciseIds: ['register-switching', 'error-correction'],
                completed: false,
            },
        ],
    },
    {
        id: 'daily-conversation',
        name: 'Dagelijks Gesprek',
        description: 'Verbeter je gespreksvaardigheid voor dagelijks gebruik',
        targetLevel: 'A2',
        steps: [
            {
                id: 'step-1',
                title: 'Basis Woordenschat',
                description: 'Leer veelgebruikte woorden en uitdrukkingen',
                exerciseIds: ['idioms-context', 'collocations', 'conversation-starters'],
                completed: false,
            },
            {
                id: 'step-2',
                title: 'Sociale Situaties',
                description: 'Leer wat je zegt in verschillende sociale situaties',
                exerciseIds: ['social-scripts', 'speech-acts'],
                completed: false,
            },
            {
                id: 'step-3',
                title: 'Modale Partikels',
                description: 'Begrijp de nuances van Nederlandse partikels',
                exerciseIds: ['modal-particles'],
                completed: false,
            },
        ],
    },
];

/**
 * Laad learning path progress
 */
export function loadLearningPathProgress(pathId: string): LearningPath | null {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem(`learning_path_${pathId}`);
        if (!stored) {
            const path = LEARNING_PATHS.find(p => p.id === pathId);
            return path || null;
        }
        return JSON.parse(stored) as LearningPath;
    } catch (error) {
        console.error('Failed to load learning path:', error);
        return null;
    }
}

/**
 * Sla learning path progress op
 */
export function saveLearningPathProgress(path: LearningPath): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(`learning_path_${path.id}`, JSON.stringify(path));
    } catch (error) {
        console.error('Failed to save learning path:', error);
    }
}

/**
 * Markeer stap als voltooid
 */
export function completeStep(pathId: string, stepId: string): void {
    const path = loadLearningPathProgress(pathId);
    if (!path) return;

    const updatedSteps = path.steps.map(step =>
        step.id === stepId
            ? { ...step, completed: true, completedAt: Date.now() }
            : step
    );

    const allCompleted = updatedSteps.every(s => s.completed);
    const updatedPath: LearningPath = {
        ...path,
        steps: updatedSteps,
        completedAt: allCompleted ? Date.now() : undefined,
    };

    saveLearningPathProgress(updatedPath);
}

/**
 * Get next recommended step
 */
export function getNextStep(pathId: string): LearningPathStep | null {
    const path = loadLearningPathProgress(pathId);
    if (!path) return null;

    const incompleteStep = path.steps.find(s => !s.completed);
    return incompleteStep || null;
}

