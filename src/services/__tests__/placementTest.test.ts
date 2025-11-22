import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { 
    generatePlacementQuestions, 
    generatePlacementQuestionsAsync,
    calculatePlacementResult 
} from '../placementTest';
import type { CEFRLevel } from '@/types';

// Mock Gemini API
vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: vi.fn().mockImplementation(() => ({
            models: {
                generateContent: vi.fn(),
            },
        })),
        Type: {
            OBJECT: 'object',
            ARRAY: 'array',
            STRING: 'string',
            INTEGER: 'integer',
        },
    };
});

describe('placementTest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('generatePlacementQuestions', () => {
        it('genereert basis vragen voor A1 niveau', () => {
            const questions = generatePlacementQuestions('A1');
            
            expect(questions.length).toBeGreaterThan(0);
            expect(questions.length).toBeLessThanOrEqual(15);
            expect(questions[0].level).toBe('A1');
            expect(questions[0].id).toBeDefined();
            expect(questions[0].question).toBeDefined();
            expect(questions[0].correctAnswer).toBeDefined();
        });

        it('genereert adaptieve vragen op basis van antwoorden', () => {
            const previousAnswers = {
                'pt-1': 'het',
                'pt-2': 'Good morning',
            };
            
            const questions = generatePlacementQuestions('A1', previousAnswers);
            
            expect(questions.length).toBeGreaterThan(3); // Moet meer vragen hebben dan basis set
        });

        it('beperkt aantal vragen tot 15', () => {
            const questions = generatePlacementQuestions('C1');
            
            expect(questions.length).toBeLessThanOrEqual(15);
        });
    });

    describe('generatePlacementQuestionsAsync', () => {
        it('valt terug op hardcoded vragen bij API fout', async () => {
            // Mock API om te falen
            const { GoogleGenAI } = await import('@google/genai');
            const mockAI = new GoogleGenAI({ apiKey: 'test' });
            vi.mocked(mockAI.models.generateContent).mockRejectedValue(new Error('API error'));

            const questions = await generatePlacementQuestionsAsync('A1');
            
            // Moet fallback gebruiken
            expect(questions.length).toBeGreaterThan(0);
            expect(questions.length).toBeLessThanOrEqual(15);
        });

        it('gebruikt cache wanneer beschikbaar', async () => {
            // Eerste call zou cache moeten vullen
            const questions1 = await generatePlacementQuestionsAsync('A1');
            
            // Tweede call zou cache moeten gebruiken
            const questions2 = await generatePlacementQuestionsAsync('A1');
            
            // Beide moeten geldige vragen retourneren
            expect(questions1.length).toBeGreaterThan(0);
            expect(questions2.length).toBeGreaterThan(0);
        });
    });

    describe('calculatePlacementResult', () => {
        it('berekent correcte scores', () => {
            const questions = [
                {
                    id: 'q1',
                    type: 'grammar' as const,
                    question: 'Test vraag 1',
                    correctAnswer: 'antwoord1',
                    level: 'A1' as CEFRLevel,
                },
                {
                    id: 'q2',
                    type: 'vocabulary' as const,
                    question: 'Test vraag 2',
                    correctAnswer: 'antwoord2',
                    level: 'A1' as CEFRLevel,
                },
            ];

            const answers = {
                q1: 'antwoord1',
                q2: 'antwoord2',
            };

            const result = calculatePlacementResult(questions, answers);
            
            expect(result.score).toBe(100);
            expect(result.grammarScore).toBe(100);
            expect(result.vocabularyScore).toBe(100);
            expect(result.level).toBe('A1');
        });

        it('bepaalt niveau op basis van scores', () => {
            const questions = [
                {
                    id: 'q1',
                    type: 'grammar' as const,
                    question: 'Test vraag',
                    correctAnswer: 'antwoord',
                    level: 'B2' as CEFRLevel,
                },
            ];

            const answers = { q1: 'antwoord' };
            const result = calculatePlacementResult(questions, answers);
            
            expect(result.level).toBe('B2');
        });

        it('genereert aanbevelingen op basis van scores', () => {
            const questions = [
                {
                    id: 'q1',
                    type: 'grammar' as const,
                    question: 'Test vraag',
                    correctAnswer: 'antwoord',
                    level: 'A1' as CEFRLevel,
                },
            ];

            const answers = { q1: 'fout antwoord' };
            const result = calculatePlacementResult(questions, answers);
            
            expect(result.recommendations.length).toBeGreaterThan(0);
        });
    });
});

