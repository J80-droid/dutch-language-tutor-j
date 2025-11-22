import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { analyzeSpeech } from '../speechAnalysis';

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

describe('speechAnalysis', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('analyzeSpeech', () => {
        it('analyseert transcript zonder expectedText', async () => {
            const transcript = 'Ik ga naar de winkel om boodschappen te doen.';
            
            const result = await analyzeSpeech(transcript);
            
            expect(result.transcript).toBe(transcript);
            expect(result.vocabularyScore).toBeGreaterThanOrEqual(0);
            expect(result.vocabularyScore).toBeLessThanOrEqual(100);
            expect(result.fluencyScore).toBeGreaterThanOrEqual(0);
            expect(result.fluencyScore).toBeLessThanOrEqual(100);
            expect(result.grammarScore).toBeGreaterThanOrEqual(0);
            expect(result.grammarScore).toBeLessThanOrEqual(100);
            expect(result.overallScore).toBeGreaterThanOrEqual(0);
            expect(result.overallScore).toBeLessThanOrEqual(100);
            expect(result.feedback).toBeDefined();
            expect(result.feedback.fluency).toBeDefined();
            expect(result.feedback.grammar).toBeDefined();
            expect(result.suggestions.length).toBeGreaterThan(0);
        });

        it('analyseert transcript met expectedText', async () => {
            const transcript = 'Ik ga naar de winkel';
            const expectedText = 'Ik ga naar de winkel om boodschappen te doen';
            
            const result = await analyzeSpeech(transcript, expectedText);
            
            expect(result.transcript).toBe(transcript);
            expect(result.grammarScore).toBeGreaterThanOrEqual(0);
            expect(result.grammarScore).toBeLessThanOrEqual(100);
        });

        it('valt terug op heuristiek bij API fout', async () => {
            // Mock API om te falen
            const { GoogleGenAI } = await import('@google/genai');
            const mockAI = new GoogleGenAI({ apiKey: 'test' });
            vi.mocked(mockAI.models.generateContent).mockRejectedValue(new Error('API error'));

            const transcript = 'Dit is een test transcript met enkele woorden';
            const result = await analyzeSpeech(transcript);
            
            // Moet nog steeds resultaten hebben (fallback)
            expect(result.fluencyScore).toBeGreaterThanOrEqual(0);
            expect(result.fluencyScore).toBeLessThanOrEqual(100);
            expect(result.feedback.fluency.length).toBeGreaterThan(0);
        });

        it('berekent vocabulary score op basis van woordenschat', async () => {
            const shortTranscript = 'Hallo';
            const longTranscript = 'Ik ga naar de winkel om boodschappen te doen en dan ga ik naar huis';
            
            const shortResult = await analyzeSpeech(shortTranscript);
            const longResult = await analyzeSpeech(longTranscript);
            
            // Langere transcript zou hogere vocabulary score moeten hebben
            expect(longResult.vocabularyScore).toBeGreaterThanOrEqual(shortResult.vocabularyScore);
        });

        it('retourneert gestructureerde feedback', async () => {
            const transcript = 'Dit is een test transcript';
            const result = await analyzeSpeech(transcript);
            
            expect(result.feedback).toHaveProperty('vocabulary');
            expect(result.feedback).toHaveProperty('fluency');
            expect(result.feedback).toHaveProperty('grammar');
            expect(Array.isArray(result.feedback.vocabulary)).toBe(true);
            expect(Array.isArray(result.feedback.fluency)).toBe(true);
            expect(Array.isArray(result.feedback.grammar)).toBe(true);
        });
    });
});

