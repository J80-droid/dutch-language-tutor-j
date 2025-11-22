import { generateExtraExercise } from './huggingfaceService';
import type { CEFRLevel } from '@/types';
import { GoogleGenAI, Type } from '@google/genai';
import { logEvent } from '@/utils/logger';

const API_KEY = import.meta.env.VITE_API_KEY;
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Cache voor writing correction scores
type WritingScoreCacheEntry = {
    score: number;
    expiresAt: number;
};

const writingScoreCache = new Map<string, WritingScoreCacheEntry>();
const WRITING_SCORE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

// Helper om hash te maken van tekst
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

export interface WritingFeedback {
    correctedText: string;
    errors: Array<{
        original: string;
        corrected: string;
        explanation: string;
        type: 'grammar' | 'spelling' | 'word-choice' | 'register' | 'punctuation';
    }>;
    overallFeedback: string;
    score: number; // 0-100
    suggestions: string[];
}

export interface WritingExercise {
    prompt: string;
    wordLimit?: number;
    register?: 'formal' | 'informal';
    context?: string;
}

/**
 * Corrigeer schrijfopdracht met AI
 */
export async function correctWriting(
    exercise: WritingExercise,
    userText: string,
    level: CEFRLevel
): Promise<WritingFeedback> {
    const correctionPrompt = `Je bent een ervaren Nederlandse taaldocent die schrijfopdrachten corrigeert.

Schrijfopdracht: ${exercise.prompt}
${exercise.context ? `Context: ${exercise.context}` : ''}
${exercise.register ? `Register: ${exercise.register}` : ''}
${exercise.wordLimit ? `Woordlimiet: ${exercise.wordLimit} woorden` : ''}

Leerling niveau: ${level}

Tekst van de leerling:
"""
${userText}
"""

Geef een gedetailleerde correctie met:
1. Gecorrigeerde tekst (volledige versie)
2. Lijst van fouten met:
   - Originele tekst
   - Gecorrigeerde tekst
   - Uitleg
   - Type fout (grammar, spelling, word-choice, register, punctuation)
3. Algemene feedback (2-3 zinnen)
4. Score (0-100)
5. Suggesties voor verbetering (3-5 punten)

Format je antwoord duidelijk met kopjes.`;

    try {
        // Gebruik dezelfde service als oefeningen genereren
        const response = await generateExtraExercise({
            exercise: {
                id: 'writing-correction',
                title: 'Schrijfopdracht Correctie',
                focus: 'Schrijfvaardigheid',
                prompt: correctionPrompt,
            },
            learnerLevel: level,
            learnerGoal: 'writing',
            contextTopic: exercise.context,
        });

        // Parse response (vereenvoudigde versie - in productie zou dit beter geparsed worden)
        return await parseCorrectionResponse(response, userText, exercise);
    } catch (error) {
        throw new Error(`Failed to correct writing: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Parse AI response naar gestructureerde feedback
 */
async function parseCorrectionResponse(response: string, originalText: string, exercise: WritingExercise): Promise<WritingFeedback> {
    // Vereenvoudigde parsing - in productie zou dit robuuster moeten zijn
    const errors: WritingFeedback['errors'] = [];
    const correctedText = originalText;
    let overallFeedback = '';
    let score = 70;
    const suggestions: string[] = [];

    // Probeer errors te extraheren uit response
    const errorMatches = response.matchAll(/Fout[:\s]+(.+?)(?=Fout|$)/gi);
    for (const match of errorMatches) {
        // Vereenvoudigde error parsing
        errors.push({
            original: match[1],
            corrected: match[1],
            explanation: 'Zie algemene feedback',
            type: 'grammar',
        });
    }

    // Extract score als beschikbaar
    const scoreMatch = response.match(/Score[:\s]+(\d+)/i);
    if (scoreMatch) {
        score = parseInt(scoreMatch[1], 10);
    } else {
        // Probeer andere formaten
        const altScoreMatch = response.match(/(\d+)\s*\/\s*100/i) || 
                              response.match(/score[:\s]*(\d+)/i) ||
                              response.match(/beoordeling[:\s]*(\d+)/i);
        if (altScoreMatch) {
            score = parseInt(altScoreMatch[1], 10);
        } else {
            // Gebruik Gemini om score te bepalen wanneer parsing faalt
            try {
                const geminiScore = await extractScoreWithGemini(originalText, response, exercise);
                if (geminiScore !== null) {
                    score = geminiScore;
                }
                // Als Gemini ook faalt, blijf bij fallback 70
            } catch (error) {
                logEvent('writing_correction', 'Gemini score extraction failed, using fallback', {
                    level: 'warn',
                    data: {
                        error: error instanceof Error ? error.message : String(error),
                    },
                });
                // Fallback naar 70 blijft behouden
            }
        }
    }

    // Extract feedback
    const feedbackMatch = response.match(/Feedback[:\s]+(.+?)(?=Suggesties|$)/is);
    if (feedbackMatch) {
        overallFeedback = feedbackMatch[1].trim();
    }

    // Extract suggestions
    const suggestionMatches = response.matchAll(/[-•]\s*(.+)/g);
    for (const match of suggestionMatches) {
        suggestions.push(match[1].trim());
    }

    return {
        correctedText: correctedText || originalText,
        errors,
        overallFeedback: overallFeedback || 'Goed gedaan! Blijf oefenen.',
        score: Math.max(0, Math.min(100, score)), // Zorg dat score tussen 0-100 is
        suggestions: suggestions.length > 0 ? suggestions : ['Blijf oefenen met schrijven'],
    };
}

/**
 * Extraheer score via Gemini wanneer parsing faalt
 */
async function extractScoreWithGemini(
    originalText: string,
    correctionResponse: string,
    exercise: WritingExercise
): Promise<number | null> {
    if (!ai) {
        return null;
    }

    // Maak cache key op basis van tekst
    const cacheKey = simpleHash(`${originalText}:${exercise.prompt}`);

    // Check cache
    const cached = writingScoreCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        logEvent('writing_correction', 'Score served from cache', {
            data: { score: cached.score },
        });
        return cached.score;
    }

    try {
        const prompt = [
            'Je bent een ervaren Nederlandse taaldocent die schrijfopdrachten beoordeelt.',
            'Je krijgt een originele tekst van een leerling en een correctie response.',
            'Je taak is om een score van 0-100 te bepalen op basis van:',
            '- Grammatica correctheid',
            '- Spelling',
            '- Woordkeuze en stijl',
            '- Register (formeel/informeel)',
            '- Algemene kwaliteit',
            '',
            `Schrijfopdracht: ${exercise.prompt}`,
            exercise.context ? `Context: ${exercise.context}` : '',
            exercise.register ? `Register: ${exercise.register}` : '',
            '',
            'Originele tekst van leerling:',
            `"""${originalText}"""`,
            '',
            'Correctie response:',
            correctionResponse.substring(0, 2000), // Limiteer lengte
            '',
            'Geef alleen een score van 0-100 terug als JSON.',
        ].filter(Boolean).join('\n');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: {
                            type: Type.INTEGER,
                            description: 'Score van 0-100',
                        },
                    },
                    required: ['score'],
                },
                temperature: 0.3,
            },
        });

        const rawText = response.text ?? '';
        const payload = JSON.parse(rawText) as {
            score?: number;
        };

        if (payload.score === undefined || payload.score === null) {
            return null;
        }

        const score = Math.max(0, Math.min(100, Math.round(payload.score)));

        // Cache resultaten
        const expiresAt = Date.now() + WRITING_SCORE_CACHE_TTL_MS;
        writingScoreCache.set(cacheKey, {
            score,
            expiresAt,
        });

        logEvent('writing_correction', 'Score extracted via Gemini', {
            data: { score },
        });

        return score;
    } catch (error) {
        logEvent('writing_correction', 'Gemini score extraction error', {
            level: 'warn',
            data: {
                error: error instanceof Error ? error.message : String(error),
            },
        });
        return null;
    }
}

