/**
 * Speech Analysis Service
 * Analyseert spraak op woordenschat, vloeiendheid en zinsbouw
 */

import { GoogleGenAI, Type } from '@google/genai';
import { logEvent } from '@/utils/logger';

const API_KEY = import.meta.env.VITE_API_KEY;
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Cache voor fluency analyses
type FluencyCacheEntry = {
    fluencyScore: number;
    feedback: string[];
    indicators: Record<string, any>;
    expiresAt: number;
};

const fluencyCache = new Map<string, FluencyCacheEntry>();
const FLUENCY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 uur

// Helper om hash te maken van transcript (zonder crypto library, gebruik simpele hash)
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

// JSON Schema voor Gemini fluency analyse
const FLUENCY_ANALYSIS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        fluencyScore: {
            type: Type.INTEGER,
            description: 'Vloeiendheid score van 0-100',
        },
        feedback: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Specifieke feedback punten over vloeiendheid',
        },
        indicators: {
            type: Type.OBJECT,
            properties: {
                speechRate: {
                    type: Type.STRING,
                    nullable: true,
                    description: 'Spreektempo (bijv. "normaal", "langzaam", "snel")',
                },
                pauses: {
                    type: Type.STRING,
                    nullable: true,
                    description: 'Aantal en type pauzes',
                },
                sentenceComplexity: {
                    type: Type.STRING,
                    nullable: true,
                    description: 'Complexiteit van zinsstructuur',
                },
                flow: {
                    type: Type.STRING,
                    nullable: true,
                    description: 'Vloeiendheid van de spraak',
                },
            },
        },
    },
    required: ['fluencyScore', 'feedback'],
} as const;

export interface SpeechAnalysisResult {
    transcript: string;
    vocabularyScore: number; // 0-100
    fluencyScore: number; // 0-100
    grammarScore: number; // 0-100
    overallScore: number; // 0-100
    feedback: {
        vocabulary: string[];
        fluency: string[];
        grammar: string[];
    };
    suggestions: string[];
}

/**
 * Analyseer vloeiendheid via Gemini API
 */
async function analyzeFluencyWithGemini(transcript: string): Promise<{ fluencyScore: number; feedback: string[] }> {
    if (!ai) {
        throw new Error('Gemini API niet beschikbaar');
    }

    // Maak cache key
    const cacheKey = simpleHash(transcript);

    // Check cache
    const cached = fluencyCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        logEvent('speech_analysis', 'Fluency served from cache', {
            data: { fluencyScore: cached.fluencyScore },
        });
        return {
            fluencyScore: cached.fluencyScore,
            feedback: cached.feedback,
        };
    }

    try {
        const prompt = [
            'Je bent een ervaren Nederlandse taaldocent die spraakvloeiendheid analyseert.',
            'Analyseer het volgende transcript op vloeiendheid:',
            '',
            `"${transcript}"`,
            '',
            'Beoordeel op basis van:',
            '- Spreektempo (woorden per minuut, natuurlijk ritme)',
            '- Pauzes en aarzelingen (te veel "uh", "eh", lange stiltes)',
            '- Zinsstructuur complexiteit (eenvoudige vs complexe zinnen)',
            '- Connectie tussen zinnen (gebruik van verbindingswoorden)',
            '- Algemene vloeiendheid (hoe natuurlijk klinkt het)',
            '',
            'Geef een score van 0-100 en specifieke feedback punten.',
            'Wees constructief en help de leerling te verbeteren.',
        ].join('\n');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: FLUENCY_ANALYSIS_SCHEMA,
                temperature: 0.3, // Lager voor analytische taak
            },
        });

        const rawText = response.text ?? '';
        const payload = JSON.parse(rawText) as {
            fluencyScore?: number;
            feedback?: string[];
            indicators?: Record<string, any>;
        };

        const fluencyScore = Math.max(0, Math.min(100, payload.fluencyScore ?? 75));
        const feedback = Array.isArray(payload.feedback) && payload.feedback.length > 0
            ? payload.feedback
            : ['Blijf oefenen met vloeiend spreken.'];

        // Cache resultaten
        const expiresAt = Date.now() + FLUENCY_CACHE_TTL_MS;
        fluencyCache.set(cacheKey, {
            fluencyScore,
            feedback,
            indicators: payload.indicators || {},
            expiresAt,
        });

        logEvent('speech_analysis', 'Fluency analyzed via Gemini', {
            data: { fluencyScore, feedbackCount: feedback.length },
        });

        return { fluencyScore, feedback };
    } catch (error) {
        logEvent('speech_analysis', 'Gemini fluency analysis failed', {
            level: 'warn',
            data: {
                error: error instanceof Error ? error.message : String(error),
            },
        });
        throw error;
    }
}

/**
 * Verbeterde heuristiek voor fluency score (fallback)
 */
function calculateFluencyHeuristic(transcript: string): { fluencyScore: number; feedback: string[] } {
    const words = transcript.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    // Detecteer pauzes en aarzelingen
    const hesitationPatterns = /\b(uh|eh|um|ah|hmm|euh)\b/gi;
    const hesitations = (transcript.match(hesitationPatterns) || []).length;
    const hesitationRate = wordCount > 0 ? hesitations / wordCount : 0;
    
    // Detecteer lange pauzes (meerdere punten/spaties)
    const longPauses = (transcript.match(/\.{2,}|\s{3,}/g) || []).length;
    
    // Bepaal spreektempo (aanname: normale spreeksnelheid is ~150 woorden/minuut)
    // We hebben geen tijd, dus gebruiken we woordlengte als proxy
    const avgWordLength = wordCount > 0
        ? words.reduce((sum, w) => sum + w.length, 0) / wordCount
        : 0;
    
    // Bereken score
    let score = 75; // Basis score
    
    // Straffen voor aarzelingen
    score -= Math.min(30, hesitationRate * 100);
    
    // Straffen voor lange pauzes
    score -= Math.min(20, longPauses * 5);
    
    // Belonen voor goede woordlengte (complexere woorden)
    if (avgWordLength > 5) {
        score += 5;
    }
    
    // Belonen voor meer woorden (meer inhoud)
    if (wordCount > 15) {
        score += 5;
    }
    
    score = Math.max(0, Math.min(100, Math.round(score)));
    
    const feedback: string[] = [];
    if (hesitationRate > 0.1) {
        feedback.push('Probeer minder "uh" en "eh" te gebruiken.');
    }
    if (longPauses > 2) {
        feedback.push('Let op lange pauzes tussen zinnen.');
    }
    if (wordCount < 10) {
        feedback.push('Probeer uitgebreider te antwoorden.');
    }
    if (feedback.length === 0) {
        feedback.push('Goede vloeiendheid! Blijf oefenen.');
    }
    
    return { fluencyScore: score, feedback };
}

/**
 * Analyseer grammatica via Gemini wanneer expectedText ontbreekt
 */
async function analyzeGrammarWithGemini(transcript: string): Promise<{ grammarScore: number; feedback: string[] }> {
    if (!ai) {
        throw new Error('Gemini API niet beschikbaar');
    }

    try {
        const prompt = [
            'Je bent een ervaren Nederlandse taaldocent die grammatica analyseert.',
            'Analyseer het volgende transcript op grammatica:',
            '',
            `"${transcript}"`,
            '',
            'Beoordeel op basis van:',
            '- Correcte woordvolgorde',
            '- Juiste werkwoordsvormen',
            '- Correct gebruik van lidwoorden (de/het)',
            '- Juiste meervoudsvormen',
            '- Algemene grammatica correctheid',
            '',
            'Geef een score van 0-100 en specifieke feedback punten.',
            'Wees constructief en help de leerling te verbeteren.',
        ].join('\n');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        grammarScore: {
                            type: Type.INTEGER,
                            description: 'Grammatica score van 0-100',
                        },
                        feedback: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'Specifieke feedback punten over grammatica',
                        },
                    },
                    required: ['grammarScore', 'feedback'],
                },
                temperature: 0.3,
            },
        });

        const rawText = response.text ?? '';
        const payload = JSON.parse(rawText) as {
            grammarScore?: number;
            feedback?: string[];
        };

        const grammarScore = Math.max(0, Math.min(100, payload.grammarScore ?? 70));
        const feedback = Array.isArray(payload.feedback) && payload.feedback.length > 0
            ? payload.feedback
            : ['Let op je zinsbouw.'];

        logEvent('speech_analysis', 'Grammar analyzed via Gemini', {
            data: { grammarScore },
        });

        return { grammarScore, feedback };
    } catch (error) {
        logEvent('speech_analysis', 'Gemini grammar analysis failed', {
            level: 'warn',
            data: {
                error: error instanceof Error ? error.message : String(error),
            },
        });
        throw error;
    }
}

/**
 * Analyseer spraak transcript
 * Gebruikt Gemini API voor fluency en grammar analyse
 */
export async function analyzeSpeech(
    transcript: string,
    expectedText?: string
): Promise<SpeechAnalysisResult> {
    const words = transcript.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const uniqueWords = new Set(words).size;
    
    // Basis vocabulary score
    const vocabularyScore = Math.min(100, Math.max(0, 
        (uniqueWords / Math.max(1, wordCount)) * 50 + // Diversiteit
        Math.min(50, wordCount * 2) // Aantal woorden
    ));
    
    // Fluency score via Gemini of fallback
    let fluencyScore = 75;
    let fluencyFeedback: string[] = ['Blijf oefenen met vloeiend spreken.'];
    
    try {
        const fluencyResult = await analyzeFluencyWithGemini(transcript);
        fluencyScore = fluencyResult.fluencyScore;
        fluencyFeedback = fluencyResult.feedback;
    } catch (error) {
        logEvent('speech_analysis', 'Using fluency heuristic fallback', {
            level: 'warn',
        });
        const heuristicResult = calculateFluencyHeuristic(transcript);
        fluencyScore = heuristicResult.fluencyScore;
        fluencyFeedback = heuristicResult.feedback;
    }
    
    // Grammar score
    let grammarScore = 70;
    let grammarFeedback: string[] = ['Let op je zinsbouw.'];
    
    if (expectedText) {
        grammarScore = compareGrammar(transcript, expectedText);
        grammarFeedback = grammarScore >= 80
            ? ['Goede grammatica!']
            : ['Let op je zinsbouw en woordvolgorde.'];
    } else {
        // Gebruik Gemini wanneer expectedText ontbreekt
        try {
            const grammarResult = await analyzeGrammarWithGemini(transcript);
            grammarScore = grammarResult.grammarScore;
            grammarFeedback = grammarResult.feedback;
        } catch (error) {
            logEvent('speech_analysis', 'Using default grammar score', {
                level: 'warn',
            });
            // Fallback naar default
        }
    }

    const overallScore = Math.round((vocabularyScore + fluencyScore + grammarScore) / 3);

    return {
        transcript,
        vocabularyScore: Math.round(vocabularyScore),
        fluencyScore: Math.round(fluencyScore),
        grammarScore: Math.round(grammarScore),
        overallScore,
        feedback: {
            vocabulary: wordCount > 10 
                ? ['Goede woordenschat!'] 
                : ['Probeer meer verschillende woorden te gebruiken.'],
            fluency: fluencyFeedback,
            grammar: grammarFeedback,
        },
        suggestions: [
            'Oefen dagelijks om je vloeiendheid te verbeteren',
            'Luister naar native speakers om je uitspraak te verbeteren',
            'Focus op correcte grammatica in je zinnen',
        ],
    };
}

/**
 * Vergelijk grammatica tussen transcript en verwachte tekst
 */
function compareGrammar(transcript: string, expectedText: string): number {
    // Vereenvoudigde vergelijking
    const transcriptWords = transcript.toLowerCase().split(/\s+/);
    const expectedWords = expectedText.toLowerCase().split(/\s+/);
    
    let matches = 0;
    const minLength = Math.min(transcriptWords.length, expectedWords.length);
    
    for (let i = 0; i < minLength; i++) {
        if (transcriptWords[i] === expectedWords[i]) {
            matches++;
        }
    }
    
    return minLength > 0 ? Math.round((matches / expectedWords.length) * 100) : 0;
}

/**
 * Record audio en converteer naar tekst
 * Gebruikt Web Speech API
 */
export async function recordAndTranscribe(): Promise<string> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            reject(new Error('Speech recognition niet beschikbaar in deze browser'));
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'nl-NL';
        recognition.continuous = false;
        recognition.interimResults = false;

        let transcript = '';

        recognition.onresult = (event: any) => {
            transcript = event.results[0][0].transcript;
        };

        recognition.onend = () => {
            resolve(transcript);
        };

        recognition.onerror = (event: any) => {
            reject(new Error(`Speech recognition error: ${event.error}`));
        };

        recognition.start();
    });
}

