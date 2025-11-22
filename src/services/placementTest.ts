import type { CEFRLevel } from '@/types';
import type { ExerciseQuestion } from '@/types/exercise';
import { GoogleGenAI, Type } from '@google/genai';
import { logEvent } from '@/utils/logger';
import { cefrDescriptors } from '@/data/cefrDescriptors';

const API_KEY = import.meta.env.VITE_API_KEY;
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export interface PlacementTestQuestion {
    id: string;
    type: 'grammar' | 'vocabulary' | 'reading';
    question: string;
    options?: string[];
    correctAnswer: string | string[];
    level: CEFRLevel; // Niveau van deze vraag
}

export interface PlacementTestResult {
    level: CEFRLevel;
    score: number; // 0-100
    grammarScore: number;
    vocabularyScore: number;
    readingScore: number;
    recommendations: string[];
}

export interface PlacementTestState {
    currentQuestionIndex: number;
    answers: Record<string, string | string[]>;
    questions: PlacementTestQuestion[];
    startedAt: number;
    currentLevelTesting: CEFRLevel; // Added for batch logic
}

// Cache voor placement test vragen
type PlacementQuestionsCacheEntry = {
    questions: PlacementTestQuestion[];
    expiresAt: number;
};

const placementQuestionsCache = new Map<string, PlacementQuestionsCacheEntry>();
const PLACEMENT_QUESTIONS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 uur
const MAX_PLACEMENT_QUESTIONS_ATTEMPTS = 2;

// JSON Schema voor Gemini API response
const PLACEMENT_QUESTIONS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        questions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    type: { 
                        type: Type.STRING,
                        description: 'Een van: grammar, vocabulary, reading'
                    },
                    question: { type: Type.STRING },
                    options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        nullable: true,
                    },
                    correctAnswer: { 
                        type: Type.STRING,
                        description: 'Correct antwoord (string voor single, comma-separated voor multiple)'
                    },
                    correctAnswers: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        nullable: true,
                        description: 'Voor multiple choice met meerdere correcte antwoorden',
                    },
                    level: {
                        type: Type.STRING,
                        description: 'CEFR niveau: A1, A2, B1, B2, C1'
                    },
                    explanation: {
                        type: Type.STRING,
                        nullable: true,
                    },
                },
                required: ['id', 'type', 'question', 'correctAnswer', 'level'],
            },
        },
        adaptiveLevel: {
            type: Type.STRING,
            nullable: true,
            description: 'Aanbevolen niveau voor volgende vraag set',
        },
    },
    required: ['questions'],
} as const;

/**
 * Bouw prompt voor placement test vragen generatie
 */
function buildPlacementQuestionsPrompt(
    currentLevel: CEFRLevel,
    previousAnswers: Record<string, string | string[]>,
    questionCount: number = 10
): string {
    // Haal specifieke descriptors op voor het huidige niveau
    const levelDescriptors = cefrDescriptors[currentLevel];

    return [
        'Je bent een ervaren Nederlandse taaldocent die een adaptieve placement test maakt.',
        `Doelgroep: Leerling die Nederlands leert (alles moet in het Nederlands).`,
        `Huidig te testen niveau: ${currentLevel} (${levelDescriptors.label})`,
        '',
        `Genereer ${questionCount} placement test vragen die EXACT passen bij niveau ${currentLevel}.`,
        '- Een mix zijn van grammar, vocabulary en reading vragen',
        '- Multiple choice opties hebben waar mogelijk',
        '- Duidelijke correcte antwoorden hebben',
        '- Optionele uitleg bevatten voor het correcte antwoord',
        '- 100% in het Nederlands zijn (ook de vragen en opties, geen andere talen gebruiken)',
        '',
        `Gebruik deze CEFR-competenties voor niveau ${currentLevel}:`,
        `- Reading: ${levelDescriptors.skills.reading}`,
        `- Listening/Reading (begrip): ${levelDescriptors.skills.listening}`,
        `- Grammar/Writing: ${levelDescriptors.skills.writing}`,
        '',
        'Voor grammar vragen: focus op specifieke Nederlandse valkuilen zoals:',
        '- Woordvolgorde (inversie, bijzin, plaats van werkwoorden)',
        '- Het gebruik van "er"',
        '- Lidwoorden (de/het)',
        '- Werkwoordstijden en vervoegingen',
        '',
        'Voor vocabulary vragen: gebruik veelvoorkomende woorden voor het niveau. Vraag naar betekenis in context of synoniemen.',
        '',
        'Voor reading vragen: geef een korte tekst (2-3 zinnen) en stel een begripsvraag.',
        '',
        'Geef de vragen terug als JSON met het gevraagde schema.',
    ].join('\n');
}

/**
 * Genereer placement test vragen via Gemini API
 */
async function generatePlacementQuestionsWithGemini(
    currentLevel: CEFRLevel = 'A1',
    previousAnswers: Record<string, string | string[]> = {},
    questionCount: number = 10
): Promise<PlacementTestQuestion[]> {
    if (!ai) {
        throw new Error('Gemini API niet beschikbaar');
    }

    // Maak cache key op basis van niveau en batch size
    const cacheKey = `${currentLevel}:${questionCount}`;
    
    const cached = placementQuestionsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        logEvent('placement_test', 'Questions served from cache', {
            data: { level: currentLevel, questionCount: cached.questions.length },
        });
        return cached.questions;
    }

    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_PLACEMENT_QUESTIONS_ATTEMPTS; attempt += 1) {
        try {
            const prompt = buildPlacementQuestionsPrompt(currentLevel, previousAnswers, questionCount);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: PLACEMENT_QUESTIONS_SCHEMA,
                    temperature: 0.7,
                },
            });

            const rawText = response.text ?? '';
            const payload = JSON.parse(rawText) as {
                questions?: Array<{
                    id?: string;
                    type?: string;
                    question?: string;
                    options?: string[];
                    correctAnswer?: string | string[];
                    level?: string;
                    explanation?: string;
                }>;
                adaptiveLevel?: string;
            };

            if (!payload.questions || !Array.isArray(payload.questions)) {
                throw new Error('Ongeldige response structuur: questions array ontbreekt');
            }

            // Valideer en transformeer vragen
            const questions: PlacementTestQuestion[] = [];
            for (let i = 0; i < payload.questions.length && questions.length < questionCount; i++) {
                const q = payload.questions[i];
                if (!q.id || !q.type || !q.question || (!q.correctAnswer && !q.correctAnswers) || !q.level) {
                    continue;
                }

                const questionType = q.type as 'grammar' | 'vocabulary' | 'reading';
                if (!['grammar', 'vocabulary', 'reading'].includes(questionType)) {
                    continue;
                }

                const level = q.level as CEFRLevel;
                
                let correctAnswer: string | string[];
                if (q.correctAnswers && Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0) {
                    correctAnswer = q.correctAnswers;
                } else if (q.correctAnswer) {
                    correctAnswer = q.correctAnswer;
                } else {
                    continue; // Skip als geen correct antwoord
                }

                questions.push({
                    id: q.id || `pt-${currentLevel}-${questions.length + 1}`,
                    type: questionType,
                    question: q.question,
                    options: q.options && q.options.length > 0 ? q.options : undefined,
                    correctAnswer,
                    level: level as CEFRLevel, 
                });
            }

            if (questions.length === 0) {
                throw new Error('Geen geldige vragen gegenereerd');
            }

            // Cache resultaten
            const expiresAt = Date.now() + PLACEMENT_QUESTIONS_CACHE_TTL_MS;
            placementQuestionsCache.set(cacheKey, { questions, expiresAt });

            logEvent('placement_test', 'Questions generated via Gemini', {
                data: { level: currentLevel, questionCount: questions.length, attempt: attempt + 1 },
            });

            return questions;
        } catch (error) {
            lastError = error;
            logEvent('placement_test', 'Gemini generation attempt failed', {
                level: 'warn',
                data: {
                    level: currentLevel,
                    attempt: attempt + 1,
                    error: error instanceof Error ? error.message : String(error),
                },
            });
            if (attempt < MAX_PLACEMENT_QUESTIONS_ATTEMPTS - 1) {
                // Wacht kort voordat retry
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    throw lastError || new Error('Kon geen vragen genereren via Gemini');
}

/**
 * Genereer adaptieve placement test vragen
 * Probeert eerst Gemini API, valt terug op hardcoded vragen bij fouten
 */
export async function generatePlacementQuestionsAsync(
    currentLevel: CEFRLevel = 'A1',
    previousAnswers: Record<string, string | string[]> = {},
    questionCount: number = 10
): Promise<PlacementTestQuestion[]> {
    try {
        return await generatePlacementQuestionsWithGemini(currentLevel, previousAnswers, questionCount);
    } catch (error) {
        logEvent('placement_test', 'Falling back to hardcoded questions', {
            level: 'warn',
            data: {
                level: currentLevel,
                error: error instanceof Error ? error.message : String(error),
            },
        });
        // Fallback naar bestaande hardcoded vragen
        return generatePlacementQuestions(currentLevel, previousAnswers, questionCount);
    }
}

/**
 * Genereer adaptieve placement test vragen (sync versie voor backward compatibility)
 * Start met A1 niveau en pas aan op basis van antwoorden
 */
export function generatePlacementQuestions(
    currentLevel: CEFRLevel = 'A1',
    previousAnswers: Record<string, string | string[]> = {},
    questionCount: number = 10
): PlacementTestQuestion[] {
    // Fallback vragen set
    const allQuestions: PlacementTestQuestion[] = [
        // A1
        {
            id: 'pt-a1-1',
            type: 'grammar',
            question: 'Wat is het juiste lidwoord? ___ huis',
            options: ['de', 'het'],
            correctAnswer: 'het',
            level: 'A1',
        },
        {
            id: 'pt-a1-2',
            type: 'vocabulary',
            question: 'Wanneer zeg je "goedemorgen"?',
            options: ['In de ochtend', 'In de avond', 'Bij het weggaan', 'Als bedankje'],
            correctAnswer: 'In de ochtend',
            level: 'A1',
        },
        {
            id: 'pt-a1-3',
            type: 'grammar',
            question: 'Vul in: Ik ___ Nederlands leren.',
            options: ['wil', 'wilt', 'willen', 'wilt'],
            correctAnswer: 'wil',
            level: 'A1',
        },
        {
            id: 'pt-a1-4',
            type: 'reading',
            question: 'Lees: "Ik heet Anna. Ik kom uit Nederland." Waar komt Anna vandaan?',
            options: ['Duitsland', 'Nederland', 'België', 'Engeland'],
            correctAnswer: 'Nederland',
            level: 'A1',
        },
        {
            id: 'pt-a1-5',
            type: 'vocabulary',
            question: 'Wat is dit? (Een voertuig met twee wielen waar je op trapt)',
            options: ['Een auto', 'Een fiets', 'Een trein', 'Een bus'],
            correctAnswer: 'Een fiets',
            level: 'A1',
        },

        // A2
        {
            id: 'pt-a2-1',
            type: 'grammar',
            question: 'Vul in: Gisteren ___ ik naar de winkel.',
            options: ['ga', 'ging', 'gaan', 'gaat'],
            correctAnswer: 'ging',
            level: 'A2',
        },
        {
            id: 'pt-a2-2',
            type: 'reading',
            question: 'Lees: "Jan gaat elke dag met de fiets naar zijn werk. Hij vindt het gezond en goedkoop." Waarom fietst Jan?',
            options: ['Omdat hij geen auto heeft', 'Omdat het gezond en goedkoop is', 'Omdat de bus te laat komt', 'Omdat hij graag wandelt'],
            correctAnswer: 'Omdat het gezond en goedkoop is',
            level: 'A2',
        },
        {
            id: 'pt-a2-3',
            type: 'grammar',
            question: 'Maak de zin af: Ik ga naar bed, omdat ___',
            options: ['ik ben moe', 'ik moe ben', 'ben ik moe', 'moe ik ben'],
            correctAnswer: 'ik moe ben',
            level: 'A2',
        },
        {
            id: 'pt-a2-4',
            type: 'vocabulary',
            question: 'Wat zeg je als je iemand wilt bedanken?',
            options: ['Alsjeblieft', 'Dankjewel', 'Pardon', 'Tot ziens'],
            correctAnswer: 'Dankjewel',
            level: 'A2',
        },
        {
            id: 'pt-a2-5',
            type: 'reading',
            question: 'Lees: "De trein vertrekt van spoor 5 om 14:30." Hoe laat vertrekt de trein?',
            options: ['Half drie', 'Half vier', 'Kwart over twee', 'Kwart voor drie'],
            correctAnswer: 'Half drie',
            level: 'A2',
        },

        // B1
        {
            id: 'pt-b1-1',
            type: 'grammar',
            question: 'Kies de juiste zin:',
            options: [
                'Omdat ik ziek was, ik bleef thuis.',
                'Omdat ik was ziek, bleef ik thuis.',
                'Omdat ik ziek was, bleef ik thuis.',
                'Omdat ziek ik was, bleef ik thuis.'
            ],
            correctAnswer: 'Omdat ik ziek was, bleef ik thuis.',
            level: 'B1',
        },
        {
            id: 'pt-b1-2',
            type: 'vocabulary',
            question: 'Wat betekent "duurzaam"?',
            options: ['Goedkoop', 'Tijdelijk', 'Lang houdbaar en milieuvriendelijk', 'Snel kapot'],
            correctAnswer: 'Lang houdbaar en milieuvriendelijk',
            level: 'B1',
        },
        {
            id: 'pt-b1-3',
            type: 'reading',
            question: 'Lees: "Hoewel het regende, gingen we toch wandelen. We hadden wel paraplu\'s bij ons." Wat deden ze?',
            options: ['Ze bleven binnen', 'Ze gingen fietsen', 'Ze gingen wandelen ondanks de regen', 'Ze vergaten hun paraplu'],
            correctAnswer: 'Ze gingen wandelen ondanks de regen',
            level: 'B1',
        },
        {
            id: 'pt-b1-4',
            type: 'grammar',
            question: 'Vul in: Als ik rijk was, ___ ik een groot huis kopen.',
            options: ['zal', 'zou', 'zullen', 'kan'],
            correctAnswer: 'zou',
            level: 'B1',
        },
        {
            id: 'pt-b1-5',
            type: 'vocabulary',
            question: 'Welk woord past niet in het rijtje?',
            options: ['Bakker', 'Slager', 'Groenteboer', 'Timmerman'],
            correctAnswer: 'Timmerman',
            level: 'B1',
        },

        // B2
        {
            id: 'pt-b2-1',
            type: 'grammar',
            question: 'Vul in: Er is ___ gedaan om het probleem op te lossen.',
            options: ['niets', 'iets', 'alles', 'veel'],
            correctAnswer: 'veel',
            level: 'B2',
        },
        {
            id: 'pt-b2-2',
            type: 'vocabulary',
            question: 'Wat is een synoniem voor "consequent"?',
            options: ['Af en toe', 'Regelmatig en volgens plan', 'Toevallig', 'Onverwacht'],
            correctAnswer: 'Regelmatig en volgens plan',
            level: 'B2',
        },
        {
            id: 'pt-b2-3',
            type: 'reading',
            question: 'Lees: "De directie heeft besloten om de vergadering uit te stellen vanwege onvoorziene omstandigheden." Wat is er gebeurd?',
            options: ['De vergadering gaat door', 'De vergadering is afgelast', 'De vergadering is later', 'De vergadering was gisteren'],
            correctAnswer: 'De vergadering is later',
            level: 'B2',
        },
        {
            id: 'pt-b2-4',
            type: 'grammar',
            question: 'Welke zin is grammaticaal correct?',
            options: ['Ik heb de man die daar loopt, gisteren gezien.', 'Ik heb de man wie daar loopt, gisteren gezien.', 'Ik heb de man dat daar loopt, gisteren gezien.', 'Ik heb de man waar daar loopt, gisteren gezien.'],
            correctAnswer: 'Ik heb de man die daar loopt, gisteren gezien.',
            level: 'B2',
        },
        {
            id: 'pt-b2-5',
            type: 'vocabulary',
            question: 'Wat betekent "relativeren"?',
            options: ['Overdrijven', 'Iets in perspectief zien', 'Verbinden', 'Ontkennen'],
            correctAnswer: 'Iets in perspectief zien',
            level: 'B2',
        },

        // C1
        {
            id: 'pt-c1-1',
            type: 'vocabulary',
            question: 'Wat betekent "escaleren"?',
            options: ['Verminderen', 'Uit de hand lopen', 'Oplossen', 'Onderhandelen'],
            correctAnswer: 'Uit de hand lopen',
            level: 'C1',
        },
        {
            id: 'pt-c1-2',
            type: 'grammar',
            question: 'Welke zin is correct?',
            options: [
                'Hadden we maar eerder vertrokken!',
                'Waren we maar eerder vertrokken!',
                'Zijn we maar eerder vertrokken!',
                'Hebben we maar eerder vertrokken!'
            ],
            correctAnswer: 'Waren we maar eerder vertrokken!',
            level: 'C1',
        },
        {
            id: 'pt-c1-3',
            type: 'reading',
            question: 'Lees: "De nuances in dit debat zijn subtiel, doch cruciaal voor een goed begrip van de materie." Wat zegt de tekst?',
            options: ['De details zijn onbelangrijk', 'De details zijn moeilijk maar belangrijk', 'Het is een makkelijk debat', 'Niemand begrijpt het'],
            correctAnswer: 'De details zijn moeilijk maar belangrijk',
            level: 'C1',
        },
        {
            id: 'pt-c1-4',
            type: 'vocabulary',
            question: 'Wat betekent "consensus"?',
            options: ['Ruzie', 'Overeenstemming', 'Discussie', 'Verschil'],
            correctAnswer: 'Overeenstemming',
            level: 'C1',
        },
        {
            id: 'pt-c1-5',
            type: 'grammar',
            question: 'Kies de juiste vorm: "Tenware hij ___"',
            options: ['komt', 'kwam', 'kome', 'komen'],
            correctAnswer: 'kome',
            level: 'C1',
        }
    ];

    // Filter vragen voor het gevraagde niveau
    const levelQuestions = allQuestions.filter(q => q.level === currentLevel);
    
    // Geef het gevraagde aantal terug (indien beschikbaar)
    return levelQuestions.slice(0, questionCount);
}

/**
 * Bereken placement test resultaat
 */
export function calculatePlacementResult(
    questions: PlacementTestQuestion[],
    answers: Record<string, string | string[]>
): PlacementTestResult {
    let correctCount = 0;
    let grammarCorrect = 0;
    let vocabularyCorrect = 0;
    let readingCorrect = 0;
    let grammarTotal = 0;
    let vocabularyTotal = 0;
    let readingTotal = 0;

    const levelScores: Record<CEFRLevel, number> = {
        A1: 0,
        A2: 0,
        B1: 0,
        B2: 0,
        C1: 0,
    };

    questions.forEach(q => {
        const userAnswer = answers[q.id];
        const isCorrect = Array.isArray(q.correctAnswer)
            ? Array.isArray(userAnswer) && 
              userAnswer.length === q.correctAnswer.length &&
              userAnswer.every((val, idx) => val === q.correctAnswer[idx])
            : userAnswer === q.correctAnswer;

        if (isCorrect) {
            correctCount++;
            levelScores[q.level] = (levelScores[q.level] || 0) + 1;

            if (q.type === 'grammar') {
                grammarCorrect++;
            } else if (q.type === 'vocabulary') {
                vocabularyCorrect++;
            } else if (q.type === 'reading') {
                readingCorrect++;
            }
        }

        if (q.type === 'grammar') grammarTotal++;
        if (q.type === 'vocabulary') vocabularyTotal++;
        if (q.type === 'reading') readingTotal++;
    });

    const totalScore = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const grammarScore = grammarTotal > 0 ? Math.round((grammarCorrect / grammarTotal) * 100) : 0;
    const vocabularyScore = vocabularyTotal > 0 ? Math.round((vocabularyCorrect / vocabularyTotal) * 100) : 0;
    const readingScore = readingTotal > 0 ? Math.round((readingCorrect / readingTotal) * 100) : 0;

    // Bepaal niveau op basis van scores
    let determinedLevel: CEFRLevel = 'A1';
    if (levelScores.C1 > 0 && levelScores.C1 >= levelScores.B2) {
        determinedLevel = 'C1';
    } else if (levelScores.B2 > 0 && levelScores.B2 >= levelScores.B1) {
        determinedLevel = 'B2';
    } else if (levelScores.B1 > 0 && levelScores.B1 >= levelScores.A2) {
        determinedLevel = 'B1';
    } else if (levelScores.A2 > 0 && levelScores.A2 >= levelScores.A1) {
        determinedLevel = 'A2';
    }

    const recommendations: string[] = [];
    if (grammarScore < 70) {
        recommendations.push('Focus op grammatica oefeningen');
    }
    if (vocabularyScore < 70) {
        recommendations.push('Bouw je woordenschat verder uit');
    }
    if (readingScore < 70) {
        recommendations.push('Oefen meer met begrijpend lezen');
    }

    return {
        level: determinedLevel,
        score: totalScore,
        grammarScore,
        vocabularyScore,
        readingScore,
        recommendations,
    };
}

/**
 * Sla placement test resultaat op
 */
export function savePlacementResult(result: PlacementTestResult): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem('placement_test_result', JSON.stringify({
            ...result,
            completedAt: Date.now(),
        }));
    } catch (error) {
        console.error('Failed to save placement result:', error);
    }
}

/**
 * Laad placement test resultaat
 */
export function loadPlacementResult(): PlacementTestResult | null {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem('placement_test_result');
        if (!stored) return null;
        return JSON.parse(stored) as PlacementTestResult;
    } catch (error) {
        console.error('Failed to load placement result:', error);
        return null;
    }
}
