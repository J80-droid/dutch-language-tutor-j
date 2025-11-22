import { GoogleGenAI, Type, LiveServerMessage, Modality, Blob } from "@google/genai";
import {
    CEFRLevel,
    ActivityMode,
    Transcript,
    WordDefinition,
    SessionSummary,
    LearningGoal,
    CEFR_LEVELS,
    CreativeActivityMode,
    CreativeActivityConfigMap,
    CreativeActivitySetupMap,
    CreativeWorkshopState,
    FeedbackAspect,
    FeedbackStrictnessSettings,
    FEEDBACK_ASPECTS,
    StrictnessLevel,
    LEARNING_GOAL_METADATA,
} from "../types";
import { pickCulturePrompt } from "../data/culturePrompts";
import { NewsFeedEntry } from "./newsFeedService";
import { logEvent } from "../utils/logger";

const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
    throw new Error("VITE_API_KEY environment variable not set. Please configure deze variabele in je omgeving.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const creativeSetupCache = new Map<string, CreativeWorkshopState>();

const serializeCreativeConfig = (
    mode: CreativeActivityMode,
    config: CreativeActivityConfigMap[CreativeActivityMode],
) => `${mode}:${JSON.stringify(config)}`;

const creativeSetupSchemas: Record<CreativeActivityMode, any> = {
    'creative-improvisation': {
        type: Type.OBJECT,
        properties: {
            warmUps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Korte, activerende opdrachten om deelnemers warm te draaien.",
            },
            roleCards: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        role: { type: Type.STRING },
                        emotion: { type: Type.STRING },
                        location: { type: Type.STRING },
                        prop: { type: Type.STRING, nullable: true },
                        twist: { type: Type.STRING, nullable: true },
                    },
                    required: ["role", "emotion", "location"],
                },
                description: "Minstens drie kaarten met rol, emotie en locatie; voeg optionele props of twists toe.",
            },
            sceneSeeds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Korte scènes of situaties die als start dienen.",
            },
            coachingTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Aanwijzingen voor de docent om taalgebruik te sturen.",
            },
            reflectionPrompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Vragen om na te bespreken welke taal is gebruikt.",
            },
        },
        required: ["warmUps", "roleCards", "sceneSeeds", "coachingTips", "reflectionPrompts"],
    },
    'creative-story-relay': {
        type: Type.OBJECT,
        properties: {
            openingLine: { type: Type.STRING },
            narrativeBeats: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Plotstappen of richtvragen voor elke ronde.",
            },
            twistCards: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Onverwachte wendingen die kunnen worden toegevoegd.",
            },
            genreSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Optionele genres of stijlen om variatie te brengen.",
            },
            wrapUpPrompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Vragen of opdrachten om het verhaal af te ronden en te reflecteren.",
            },
        },
        required: ["openingLine", "narrativeBeats", "twistCards", "wrapUpPrompts"],
    },
    'creative-escape-room': {
        type: Type.OBJECT,
        properties: {
            scenario: { type: Type.STRING },
            timeLimitMinutes: { type: Type.INTEGER },
            puzzles: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        clue: { type: Type.STRING },
                        answer: { type: Type.STRING },
                        languageFocus: { type: Type.STRING },
                        hint: { type: Type.STRING, nullable: true },
                    },
                    required: ["clue", "answer", "languageFocus"],
                },
                description: "Reeks taalpuzzels om te ontsnappen.",
            },
            finale: {
                type: Type.STRING,
                description: "Laatste opdracht of code om de escape te voltooien.",
            },
            supportTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Tips om differentiatie te bieden of hints te geven.",
            },
        },
        required: ["scenario", "timeLimitMinutes", "puzzles", "finale"],
    },
    'creative-emotion-barometer': {
        type: Type.OBJECT,
        properties: {
            neutralSentences: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Basale zinnen die met emotie gevarieerd kunnen worden.",
            },
            emotionCards: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        emotion: { type: Type.STRING },
                        vocalStyle: { type: Type.STRING },
                        bodyLanguage: { type: Type.STRING },
                        escalation: { type: Type.STRING, nullable: true },
                    },
                    required: ["emotion", "vocalStyle", "bodyLanguage"],
                },
            },
            feedbackChecklist: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Observatiepunten voor uitspraak, intonatie en woordkeuze.",
            },
            reflectionQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Vragen om effect en empathie te bespreken.",
            },
        },
        required: ["neutralSentences", "emotionCards", "feedbackChecklist", "reflectionQuestions"],
    },
    'creative-keyword-wheel': {
        type: Type.OBJECT,
        properties: {
            slices: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        label: { type: Type.STRING },
                        keywords: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                        },
                        challenge: { type: Type.STRING, nullable: true },
                    },
                    required: ["label", "keywords"],
                },
                description: "Segmenten van het rad met woordenschat of thema's.",
            },
            followUpTasks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Opdrachten na een spin (bijv. dialoog, uitleg, mini-spel).",
            },
            collaborativeGames: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Suggesties voor duo- of teamopdrachten.",
            },
            reflectionPrompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
            },
        },
        required: ["slices", "followUpTasks"],
    },
};

const buildCreativePrompt = <T extends CreativeActivityMode>(
    mode: T,
    config: CreativeActivityConfigMap[T],
) => {
    const baseIntro = [
        `Je bent een creatieve taalcoach.`,
        `Ontwerp een speelse oefening voor ${config.participants} deelnemer(s) op niveau ${config.level}.`,
        `De moeilijkheidsgraad is ${config.difficulty}.`,
        config.durationMinutes ? `Planmateriaal voor ongeveer ${config.durationMinutes} minuten.` : '',
        config.includeWarmup ? 'Voorzie minimaal één warme-up of activering.' : '',
    ]
        .filter(Boolean)
        .join(' ');

    switch (mode) {
        case 'creative-improvisation': {
            const improvConfig = config as CreativeActivityConfigMap['creative-improvisation'];
            return `${baseIntro} Activiteit: Improvisatierondes. Lever rolkaarten (beroep, emotie, locatie) en creatieve twists passend bij het niveau. Rondes: ${improvConfig.rounds}. Props toevoegen: ${improvConfig.includeProps ? 'ja' : 'nee'}. Gebruik korte zinnen in het Nederlands.`;
        }
        case 'creative-story-relay': {
            const storyConfig = config as CreativeActivityConfigMap['creative-story-relay'];
            return `${baseIntro} Activiteit: Verhalenestafette. Voorzie een startzin, duidelijke plotstappen en verrassende twists. Verhaaltempo: ${storyConfig.storyLength}. Twists toestaan: ${storyConfig.allowTwists ? 'ja' : 'nee'}. Werk in het Nederlands met woorden passend bij het niveau.`;
        }
        case 'creative-escape-room': {
            const escapeConfig = config as CreativeActivityConfigMap['creative-escape-room'];
            return `${baseIntro} Activiteit: Escape-taalspel. Maak ${escapeConfig.puzzleCount} taalpuzzels die logisch op elkaar volgen en eindigen in een finale opdracht. Hints toestaan: ${escapeConfig.allowHints ? 'ja' : 'nee'}. Benoem voor elke puzzel het taalaccent (woordenschat, grammatica, uitspraak, etc.).`;
        }
        case 'creative-emotion-barometer': {
            const emotionConfig = config as CreativeActivityConfigMap['creative-emotion-barometer'];
            const sentenceSourceLabel =
                emotionConfig.sentenceSource === 'custom'
                    ? 'gebruik input van docent/leerling'
                    : 'laat AI voorbeeldzinnen maken';
            return `${baseIntro} Activiteit: Emotiebarometer. Genereer ${emotionConfig.emotionCount} emotiekaarten. Zinnenbron: ${sentenceSourceLabel}. Beschrijf voor elke emotie hoe intonatie en lichaamstaal verschillen.`;
        }
        case 'creative-keyword-wheel': {
            const wheelConfig = config as CreativeActivityConfigMap['creative-keyword-wheel'];
            return `${baseIntro} Activiteit: Geluksrad met trefwoorden. Voorzie ${wheelConfig.spins} spins en maak segmenten met thema's of clusters. Mini-challenges opnemen: ${wheelConfig.includeMiniChallenges ? 'ja' : 'nee'}. Stimuleer creatieve spreekopdrachten en groepsinteractie.`;
        }
        default:
            return baseIntro;
    }
};

export const clearCreativeSetupCache = () => {
    creativeSetupCache.clear();
};

export const generateCreativeSetup = async <T extends CreativeActivityMode>(
    mode: T,
    config: CreativeActivityConfigMap[T],
    options: { forceRefresh?: boolean } = {},
): Promise<CreativeWorkshopState<T>> => {
    const cacheKey = serializeCreativeConfig(mode, config as CreativeActivityConfigMap[CreativeActivityMode]);
    if (!options.forceRefresh && creativeSetupCache.has(cacheKey)) {
        const cached = creativeSetupCache.get(cacheKey) as CreativeWorkshopState<T>;
        return {
            ...cached,
            config: cached.config as CreativeActivityConfigMap[T],
            setup: cached.setup ? { ...cached.setup } : cached.setup,
        };
    }

    const schema = creativeSetupSchemas[mode];
    const prompt = buildCreativePrompt(mode, config);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
        },
    });

    const text = response.text;
    if (!text) {
        throw new Error(`Kon geen creatieve setup genereren voor ${mode}.`);
    }

    let payload: CreativeActivitySetupMap[T];
    try {
        payload = JSON.parse(text);
    } catch (error) {
        console.error("Failed to parse creative setup JSON:", error, "Response text:", text);
        throw new Error("Kon creatieve setup niet verwerken.");
    }

    const workshopState: CreativeWorkshopState<T> = {
        mode,
        config,
        setup: payload,
        lastGeneratedAt: new Date().toISOString(),
    };
    creativeSetupCache.set(cacheKey, workshopState);
    return workshopState;
};

// Re-export LiveServerMessage for use in other modules
export type { LiveServerMessage };

export type LiveSession = {
    sendRealtimeInput(input: { media?: Blob; text?: string }): void;
    close(): void;
    sendSilentTrigger(): Promise<void>;
};


/**
 * Gets a Spanish translation and a Dutch example sentence for a given word.
 */
export const getWordDefinition = async (word: string): Promise<WordDefinition> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Geef een Spaanse vertaling en een Nederlandse voorbeeldzin voor het woord "${word}".`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING, description: "Het originele Nederlandse woord." },
                    translation: { type: Type.STRING, description: "De Spaanse vertaling." },
                    example: { type: Type.STRING, description: "Een Nederlandse voorbeeldzin." },
                },
                required: ["word", "translation", "example"]
            }
        }
    });

    try {
        const json = JSON.parse(response.text);
        return { ...json, word: word }; // Ensure the original word is returned
    } catch (e) {
        console.error("Failed to parse word definition JSON:", e, "Response text:", response.text);
        throw new Error("Could not get word definition.");
    }
};

/**
 * Gets a response from a general-purpose chatbot.
 */
export const getChatbotResponse = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "Je bent een behulpzame chatbot voor een app om Nederlands te leren. Beantwoord vragen bondig en in het Nederlands, tenzij de gebruiker expliciet om een andere taal vraagt.",
        },
    });
    return response.text;
};

/**
 * Generates a summary of a language learning session.
 */
export const getSessionSummary = async (
    transcripts: Transcript[],
    level: CEFRLevel,
    activity: ActivityMode,
    goals: LearningGoal[],
    strictness: FeedbackStrictnessSettings,
): Promise<SessionSummary> => {
    const conversationHistory = transcripts.map(t => `${t.speaker === 'user' ? 'Student' : 'Tutor'}: ${t.text}`).join('\n');
    const activeGoals = goals.length ? goals : (['fluency'] as LearningGoal[]);
    const goalBulletList = activeGoals
        .map(goalKey => {
            const label = LEARNING_GOAL_METADATA[goalKey]?.label ?? goalKey;
            return `- ${label} (sleutel: ${goalKey})`;
        })
        .join('\n');

    const aspectLabels: Record<FeedbackAspect, string> = {
        grammar: 'Grammatica',
        pronunciation: 'Uitspraak',
        fluency: 'Vloeiendheid',
        vocabulary: 'Woordenschat',
        tone: 'Toon & beleefdheid',
    };
    const strictnessLabels: Record<StrictnessLevel, string> = {
        1: 'zeer mild',
        2: 'mild',
        3: 'normaal',
        4: 'streng',
        5: 'zeer streng',
    };
    const strictnessDetails = FEEDBACK_ASPECTS.map(aspect => {
        const levelValue = strictness?.[aspect];
        if (!levelValue) {
            return null;
        }
        const label = aspectLabels[aspect];
        const descriptor = strictnessLabels[levelValue];
        return `- ${label}: ${levelValue}/5 (${descriptor})`;
    }).filter(Boolean) as string[];
    const strictnessSection = strictnessDetails.length
        ? strictnessDetails.join('\n')
        : '- Geen specifieke correctievoorkeur ingesteld.';

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Hier is een transcript van een Nederlandse taaloefensessie. De student is een Spaanstalige op CEFR-niveau ${level} en de activiteit was "${activity}".

Leerdoelen voor deze sessie:
${goalBulletList}

Correctiestrictheid (per aspect, hogere waarde = strenger):
${strictnessSection}

Opdracht:
- Vat de belangrijkste leerpunten voor de student samen (in het Nederlands).
- Identificeer 3-5 nieuwe Nederlandse woorden die ze hebben geleerd (met Spaanse vertaling en de originele Nederlandse voorbeeldzin uit het transcript).
- Geef concrete suggesties voor een volgende sessie.
- Lever per leerdoel gerichte feedback in een veld \`goalFeedback\`. Voor elk leerdoel:
  * Gebruik het sleutelwoord uit de lijst hierboven in het veld \`goal\` en het label in \`label\`.
  * Schrijf een korte \`summary\` (max. 3 zinnen) die specifiek verwijst naar prestaties in het transcript.
  * Geef een numerieke \`score\` tussen 1 en 5 (5 = uitstekend) en een passende \`scoreLabel\` (bijv. "onvoldoende", "voldoende", "uitstekend").
  * Voeg een \`strictnessNote\` toe waarin je verklaart hoe de opgegeven correctiestrictheid het feedbackadvies beïnvloedde.
  * Voeg maximaal 3 \`issues\` toe; elk item beschrijft een fout of verbeterpunt met:
    - \`note\`: beschrijving van het probleem.
    - \`quote\`: een korte letterlijke passage of parafrase uit het transcript waar het probleem zichtbaar is (indien beschikbaar).
    - \`correction\`: een voorgestelde verbetering of voorbeeldantwoord.
    - \`severity\`: 'laag', 'middel' of 'hoog' afhankelijk van de impact.

Transcript:
${conversationHistory}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    learningPoints: { type: Type.STRING, description: "Een samenvatting van de belangrijkste leerpunten in een paragraaf (Nederlands)." },
                    newVocabulary: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                word: { type: Type.STRING, description: "Het nieuwe Nederlandse woord." },
                                translation: { type: Type.STRING, description: "De Spaanse vertaling." },
                                example: { type: Type.STRING, description: "De Nederlandse zin uit het transcript waarin het woord werd gebruikt." }
                            },
                            required: ["word", "translation", "example"]
                        }
                    },
                    suggestions: { type: Type.STRING, description: "Concrete suggesties voor de volgende sessie (Nederlands)." },
                    goalFeedback: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                goal: { type: Type.STRING, description: "De sleutel van het leerdoel (bijv. 'fluency')." },
                                label: { type: Type.STRING, description: "Leesbaar label van het leerdoel." },
                                summary: { type: Type.STRING, description: "Korte paragraaf met doelgerichte feedback." },
                                score: { type: Type.INTEGER, description: "Score tussen 1 en 5 voor dit leerdoel." },
                                scoreLabel: { type: Type.STRING, description: "Korte tekstuele beoordeling die past bij de score." },
                                strictnessNote: { type: Type.STRING, nullable: true, description: "Hoe de correctiestrictheid het advies beïnvloedde." },
                                issues: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            note: { type: Type.STRING, description: "Omschrijving van de fout of het verbeterpunt." },
                                            quote: { type: Type.STRING, nullable: true, description: "Letterlijke (of bijna letterlijke) quote uit het transcript waar dit zichtbaar is." },
                                            correction: { type: Type.STRING, nullable: true, description: "Verbeterde zin of tip." },
                                            severity: { type: Type.STRING, nullable: true, description: "Ernst van het punt ('laag', 'middel' of 'hoog')." },
                                        },
                                        required: ["note"]
                                    },
                                    description: "Maximaal drie aandachtspunten per leerdoel."
                                },
                            },
                            required: ["goal", "label", "summary", "score", "scoreLabel", "issues"]
                        },
                        description: "Per leerdoel doelgerichte feedback met score, strengheidsnoot en fouten."
                    }
                },
                required: ["learningPoints", "newVocabulary", "suggestions"]
            }
        }
    });

    try {
        const json = JSON.parse(response.text);
        return json as SessionSummary;
    } catch (e) {
        console.error("Failed to parse summary JSON:", e, "Response text:", response.text);
        throw new Error("Could not get session summary.");
    }
};


export type ConversationDifficulty = 'intro' | 'basic' | 'intermediate' | 'advanced';
type ConversationKeywords = string[];

export type ConversationTopic = {
    theme: string;
    starter: string;
    followUps: string[];
    difficulty: ConversationDifficulty;
    keywords: ConversationKeywords;
    culturalNotes?: string;
};

export interface NewsConversationTopic extends ConversationTopic {
    headline: string;
    summaryText: string;
    sourceNote: string;
    sourceName: string;
    sourceUrl: string;
    articleUrl?: string;
    publishedAt: string | null;
}

const LEVEL_TO_DIFFICULTY: Record<CEFRLevel, ConversationDifficulty> = {
    A1: 'intro',
    A2: 'basic',
    B1: 'intermediate',
    B2: 'advanced',
    C1: 'advanced',
    C2: 'advanced',
};

const NEWS_LEVEL_INSTRUCTIONS: Record<CEFRLevel, string> = {
    A1: 'Gebruik maximaal twee korte zinnen. Vermijd moeilijke woorden of leg ze direct uit.',
    A2: 'Gebruik eenvoudige zinnen (maximaal drie) en licht één moeilijk woord kort toe.',
    B1: 'Gebruik drie tot vier zinnen. Benadruk hoofdredenen en gevolgen in duidelijk taalgebruik.',
    B2: 'Gebruik vier zinnen met nuance. Noem een feit, een gevolg en vraag naar een mening.',
    C1: 'Gebruik een beknopte maar genuanceerde alinea. Benoem context en mogelijke impact.',
    C2: 'Schrijf compact maar analytisch; benoem nuance en stel een kritische vraag.',
};

const formatDutchDate = (isoDate: string | null | undefined): string | null => {
    if (!isoDate) return null;
    try {
        const date = new Date(isoDate);
        if (Number.isNaN(date.getTime())) {
            return null;
        }
        return date.toLocaleDateString('nl-NL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return null;
    }
};

const buildSourceNote = (entry: NewsFeedEntry): string => {
    const dateLabel = formatDutchDate(entry.publishedAt);
    if (dateLabel) {
        return `Bron: ${entry.sourceName} (${dateLabel}). Info kan snel veranderen.`;
    }
    return `Bron: ${entry.sourceName}. Info kan snel veranderen.`;
};

const fallbackFollowUps = (headline: string): string[] => [
    `Wat vind jij van het nieuws over "${headline}"?`,
    'Welke gevolgen merk je hier misschien van in je eigen leven?',
    'Welke vragen heb je nog over dit onderwerp?',
];

const fallbackKeywords = (entry: NewsFeedEntry, max = 5): string[] => {
    const base = `${entry.title} ${entry.summary}`;
    const tokens = base
        .toLowerCase()
        .split(/[^a-z\u00C0-\u017F]+/)
        .filter(token => token.length > 2);
    const seen = new Set<string>();
    const keywords: string[] = [];
    for (const token of tokens) {
        if (!seen.has(token)) {
            seen.add(token);
            keywords.push(token);
        }
        if (keywords.length >= max) {
            break;
        }
    }
    return keywords;
};

const FALLBACK_TOPICS: Record<CEFRLevel, ConversationTopic[]> = {
    A1: [
        {
            theme: 'Dagelijkse routine',
            starter: 'Hoe ziet jouw ochtend er meestal uit?',
            followUps: [
                'Welke activiteiten doe je voor je het huis verlaat?',
                'Welke woorden vind je nog lastig om je routine te beschrijven?',
                'Vraag om een beschrijving van de belangrijkste woorden in eenvoudige taal.',
            ],
            difficulty: 'intro',
            keywords: ['opstaan', 'ontbijt', 'tijd', 'werk', 'school'],
            culturalNotes: 'Leg eenvoudige verschillen uit tussen Nederlandse en Spaanse ochtendgewoontes.',
        },
        {
            theme: "Hobby's en vrije tijd",
            starter: 'Wat doe je graag in je vrije tijd?',
            followUps: [
                'Met wie doe je dat graag en waarom?',
                'Hoe vaak heb je daar tijd voor in een week?',
                'Vraag naar één detail en leg een eenvoudig voorbeeld uit.',
            ],
            difficulty: 'intro',
            keywords: ['sport', 'muziek', 'vrienden', 'weekend', 'ontspanning'],
        },
        {
            theme: 'Boodschappen doen',
            starter: 'Wat koop je meestal als je boodschappen doet?',
            followUps: [
                'Vraag naar de supermarkt of markt die ze graag bezoeken.',
                'Bespreek prijzen of producten die anders zijn dan in Spanje.',
                'Laat de leerling een korte boodschappenlijst maken.',
            ],
            difficulty: 'basic',
            keywords: ['supermarkt', 'product', 'prijs', 'lijst', 'winkel'],
        },
        {
            theme: 'Familie',
            starter: 'Kun je iets vertellen over je familie?',
            followUps: [
                'Vraag naar één familielid en beschrijf die persoon.',
                'Bespreek hoe vaak ze elkaar zien.',
                'Laat de leerling twee overeenkomsten en verschillen noemen tussen familiestructuren in Nederland en Spanje.',
            ],
            difficulty: 'basic',
            keywords: ['ouders', 'broers', 'zussen', 'familie', 'relatie'],
        },
    ],
    A2: [
        {
            theme: 'Eten en koken',
            starter: 'Wat is jouw favoriete gerecht om te koken of te eten?',
            followUps: [
                'Welke ingrediënten gebruik je meestal?',
                'Vergelijk het gerecht met iets typisch Spaans en vraag om verschillen.',
                'Nodig de leerling uit om een eenvoudige instructie te geven.',
            ],
            difficulty: 'basic',
            keywords: ['recept', 'ingredienten', 'keuken', 'koken', 'eten'],
        },
        {
            theme: 'Weekendplannen',
            starter: 'Wat heb je dit weekend gedaan of wat ga je doen?',
            followUps: [
                'Vraag door naar het gezelschap of de locatie.',
                'Vraag naar een gevoel of mening over de activiteit.',
                'Laat de leerling een korte samenvatting geven.',
            ],
            difficulty: 'basic',
            keywords: ['weekend', 'plannen', 'vrienden', 'uitgaan', 'ontspanning'],
        },
        {
            theme: 'Werk of stage',
            starter: 'Wat voor werk of stage doe je momenteel?',
            followUps: [
                'Vraag naar taken die ze leuk of lastig vinden.',
                'Bespreek een situatie met een collega of leidinggevende.',
                'Laat de leerling beschrijven hoe een typische dag eruitziet.',
            ],
            difficulty: 'intermediate',
            keywords: ['werk', 'collega', 'taak', 'stage', 'baan'],
        },
        {
            theme: 'Reizen in Nederland',
            starter: 'Welke Nederlandse stad wil je graag bezoeken, en waarom?',
            followUps: [
                'Vraag naar vervoer en reisplanning.',
                'Vergelijk de stad met een plek in Spanje.',
                'Vraag naar één culturele activiteit die ze willen proberen.',
            ],
            difficulty: 'intermediate',
            keywords: ['reizen', 'stad', 'trein', 'museum', 'toerisme'],
        },
    ],
    B1: [
        {
            theme: 'Reizen en culturen',
            starter: 'Welk land of welke stad zou je graag bezoeken en waarom?',
            followUps: [
                'Vraag naar een ervaring uit het verleden om te vergelijken.',
                'Stimuleer het gebruik van beschrijvende woorden voor cultuur en mensen.',
                'Laat de leerling een vervolgplan in drie stappen beschrijven.',
            ],
            difficulty: 'intermediate',
            keywords: ['cultuur', 'ervaring', 'verschil', 'budget', 'voorbereiding'],
        },
        {
            theme: 'Werk of studie',
            starter: 'Wat vind je het interessantste aan je werk of studie?',
            followUps: [
                'Vraag naar een recente uitdaging en hoe die is opgelost.',
                'Nodig uit tot uitleg van vaktermen in eenvoudig Nederlands.',
                'Vraag naar toekomstige doelen en hoe die bereikt kunnen worden.',
            ],
            difficulty: 'intermediate',
            keywords: ['studie', 'project', 'vaardigheid', 'doel', 'presentatie'],
        },
        {
            theme: 'Gezondheid en gewoontes',
            starter: 'Hoe probeer je gezond te blijven in een drukke week?',
            followUps: [
                'Vraag naar sport- of slaappatronen.',
                'Bespreek verschillen tussen Nederlandse en Spaanse eetgewoonten.',
                'Laat de leerling een concreet advies formuleren voor iemand anders.',
            ],
            difficulty: 'intermediate',
            keywords: ['gezondheid', 'sport', 'voeding', 'stress', 'routine'],
        },
        {
            theme: 'Nieuws en actualiteit',
            starter: 'Welk nieuwsartikel of onderwerp heeft je deze week geraakt?',
            followUps: [
                'Vraag naar de bron en waarom die betrouwbaar is.',
                'Bespreek mogelijke gevolgen op korte en lange termijn.',
                'Stimuleer de leerling om een persoonlijke mening te formuleren.',
            ],
            difficulty: 'advanced',
            keywords: ['nieuws', 'politiek', 'maatschappij', 'impact', 'mening'],
        },
    ],
    B2: [
        {
            theme: 'Technologie en dagelijks leven',
            starter: 'Hoe beïnvloedt technologie jouw dagelijks leven?',
            followUps: [
                'Vraag naar voordelen én nadelen en vraag om voorbeelden.',
                'Daag uit tot het formuleren van een standpunt en tegenargument.',
                'Laat de leerling een voorspelling doen voor de komende vijf jaar.',
            ],
            difficulty: 'advanced',
            keywords: ['technologie', 'privacy', 'innovatie', 'sociale media', 'automatisering'],
        },
        {
            theme: 'Gezondheid en welzijn',
            starter: 'Wat doe je om gezond te blijven in een drukke week?',
            followUps: [
                'Vraag naar routines en naar hun effect op het humeur.',
                'Laat de leerling een persoonlijk advies geven aan een vriend.',
                'Vraag naar culturele verschillen met gezondheid in Spanje.',
            ],
            difficulty: 'advanced',
            keywords: ['balans', 'burn-out', 'preventie', 'voeding', 'slaap'],
        },
        {
            theme: 'Werkcultuur vergelijken',
            starter: 'Welke verschillen zie jij tussen de werkcultuur in Nederland en Spanje?',
            followUps: [
                'Vraag naar voorbeelden uit de eigen ervaring.',
                'Bespreek hoe communicatie of hiërarchie verschilt.',
                'Laat de leerling strategieën noemen om zich aan te passen.',
            ],
            difficulty: 'advanced',
            keywords: ['werkcultuur', 'communicatie', 'vergadering', 'hiërarchie', 'feedback'],
            culturalNotes: 'Benadruk het belang van directe communicatie in Nederlandse context.',
        },
        {
            theme: 'Duurzaamheid en milieu',
            starter: 'Hoe gaat Nederland volgens jou om met duurzaamheid?',
            followUps: [
                'Vraag naar concrete initiatieven in de buurt van de leerling.',
                'Laat hen een persoonlijke bijdrage beschrijven.',
                'Bespreek welke rol bedrijven en overheid moeten spelen.',
            ],
            difficulty: 'advanced',
            keywords: ['duurzaamheid', 'milieu', 'klimaat', 'beleid', 'initiatieven'],
        },
    ],
    C1: [
        {
            theme: "Maatschappelijke thema's",
            starter: 'Welk maatschappelijk thema houdt jou op dit moment het meest bezig?',
            followUps: [
                'Vraag naar de onderliggende oorzaken en mogelijke oplossingen.',
                'Laat de leerling verschillende perspectieven verkennen.',
                'Stimuleer het gebruik van nuance en vakterminologie.',
            ],
            difficulty: 'advanced',
            keywords: ['maatschappij', 'beleid', 'ethiek', 'historie', 'stakeholders'],
        },
        {
            theme: 'Professionele ontwikkeling',
            starter: 'Wat wil je in de komende jaren professioneel bereiken?',
            followUps: [
                'Vraag naar vaardigheden die ontwikkeld moeten worden.',
                'Laat de leerling reflecteren op culturele verschillen in werkstijl.',
                'Nodig uit tot het formuleren van een concreet actieplan.',
            ],
            difficulty: 'advanced',
            keywords: ['carrière', 'netwerk', 'vaardigheden', 'mentor', 'strategie'],
        },
        {
            theme: 'Innovatie en ondernemerschap',
            starter: 'Hoe zie jij de rol van innovatie in jouw vakgebied?',
            followUps: [
                'Vraag naar recente trends en voorbeelden.',
                'Bespreek obstakels en hoe die overwonnen kunnen worden.',
                'Nodig de leerling uit om een business- of projectidee te schetsen.',
            ],
            difficulty: 'advanced',
            keywords: ['innovatie', 'ondernemerschap', 'investering', 'risico', 'strategie'],
        },
        {
            theme: 'Culturele identiteiten',
            starter: 'Hoe beïnvloeden je verschillende culturele achtergronden jouw identiteit?',
            followUps: [
                'Vraag naar momenten waarop identiteiten botsten of samensmolten.',
                'Bespreek hoe taal hierin een rol speelt.',
                'Laat de leerling een advies formuleren voor iemand die tussen culturen navigeert.',
            ],
            difficulty: 'advanced',
            keywords: ['identiteit', 'cultuur', 'taal', 'integratie', 'diversiteit'],
        },
    ],
    C2: [
        {
            theme: 'Filosofische vragen',
            starter: 'Welke vraag stel je jezelf regelmatig over het leven of de samenleving?',
            followUps: [
                'Vraag naar de argumenten en tegenargumenten die ze hebben overwogen.',
                'Laat de leerling refereren aan literatuur, media of persoonlijke ervaringen.',
                'Daag uit tot een samenvatting in academische stijl.',
            ],
            difficulty: 'advanced',
            keywords: ['filosofie', 'ethiek', 'maatschappij', 'argumentatie', 'reflectie'],
        },
        {
            theme: 'Internationale samenwerking',
            starter: 'Hoe zie jij de rol van internationale samenwerking in jouw vakgebied?',
            followUps: [
                'Vraag naar concrete voorbeelden of casussen.',
                'Stimuleer het gebruik van idiomatische uitdrukkingen en vakjargon.',
                'Vraag om een synthese van de belangrijkste inzichten aan het einde.',
            ],
            difficulty: 'advanced',
            keywords: ['samenwerking', 'diplomatie', 'globalisering', 'stakeholders', 'impact'],
        },
        {
            theme: "Toekomstscenario's",
            starter: "Welke toekomstscenario's voor Europa zie jij de komende twintig jaar ontstaan?",
            followUps: [
                'Vraag naar optimistische en pessimistische perspectieven.',
                'Laat de leerling bronnen of modellen noemen die ze vertrouwen.',
                'Bespreek implicaties voor economie, cultuur en technologie.',
            ],
            difficulty: 'advanced',
            keywords: ['scenario', 'Europa', 'politiek', 'economie', 'technologie'],
        },
        {
            theme: 'Literatuur en kunst',
            starter: 'Welke rol spelen literatuur of kunst in jouw leven en denken?',
            followUps: [
                'Vraag naar een werk dat hun visie heeft veranderd.',
                'Laat de leerling een interpretatie geven van een thema of personage.',
                'Bespreek hoe kunst maatschappelijke discussies kan beïnvloeden.',
            ],
            difficulty: 'advanced',
            keywords: ['literatuur', 'kunst', 'interpretatie', 'creativiteit', 'maatschappij'],
        },
    ],
};

const FALLBACK_CONVERSATION_CONTEXT: ConversationTopic = FALLBACK_TOPICS.A1[0];

const CEFR_LEVEL_SUMMARY: Record<CEFRLevel, string> = {
    A1: 'Doorbraakniveau: begrijpt vertrouwde woorden en eenvoudige zinnen over zichzelf, familie en directe omgeving. Spreek langzaam, gebruik basiswoordenschat en concrete context.',
    A2: 'Tussenstap: kent veelgebruikte uitdrukkingen over alledaagse situaties zoals winkelen, werk en familie. Houd taal eenvoudig, gebruik korte gekoppelde zinnen en geef visuele of concrete aanknopingspunten.',
    B1: 'Drempelniveau: begrijpt hoofdpunten van standaardtaal rond werk, school en vrije tijd. Kan ervaringen en meningen beschrijven met eenvoudige verbindingswoorden. Stimuleer vloeiendheid met duidelijke structuur.',
    B2: 'Uitzichtniveau: verwerkt hoofdlijnen van complexe teksten en neemt spontaan deel aan gesprekken. Vraag naar mening, voor- en nadelen en stimuleer genuanceerde taal.',
    C1: 'Effectieve operationele vaardigheid: begrijpt lange, complexe teksten en gebruikt taal flexibel voor sociale, academische en professionele doelen. Daag uit met analyse, nuance en synthese.',
    C2: 'Beheersingsniveau: begrijpt moeiteloos alle taal en drukt zich zeer precies en genuanceerd uit. Stel kritische, abstracte vragen en moedig diepgaande reflectie aan.',
};

const AI_TOPIC_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        theme: { type: Type.STRING, description: 'Kort kernachtig onderwerp in het Nederlands.' },
        starter: { type: Type.STRING, description: 'Openingsvraag in het Nederlands.' },
        followUps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Drie open vervolgvragen in het Nederlands.',
        },
        keywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            nullable: true,
            description: 'Trefwoorden of uitdrukkingen (3-6 items).',
        },
        difficulty: {
            type: Type.STRING,
            description: 'Gebruik één van: intro, basic, intermediate, advanced.',
        },
        culturalNotes: {
            type: Type.STRING,
            nullable: true,
            description: 'Korte culturele context of tip (optioneel).',
        },
    },
    required: ['theme', 'starter', 'followUps'],
} as const;

type TopicSource = 'local' | 'remote' | 'fallback' | 'news' | 'ai';

export interface TopicsMeta {
    source: TopicSource;
    timestamp: number;
    statusCode?: number | null;
    error?: string | null;
}

const TOPICS_STORAGE_KEY = 'customTopics';
let topicsCache: Record<CEFRLevel, ConversationTopic[]> | null = null;
let topicsMeta: TopicsMeta | null = null;

const isBrowserEnvironment = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const cloneFallbackTopics = (): Record<CEFRLevel, ConversationTopic[]> =>
    JSON.parse(JSON.stringify(FALLBACK_TOPICS));

const sanitiseTopic = (candidate: any): ConversationTopic | null => {
    if (!candidate || typeof candidate !== 'object') {
        return null;
    }
    const theme = String(candidate.theme ?? '').trim();
    const starter = String(candidate.starter ?? '').trim();
    const difficulty = String(candidate.difficulty ?? '').trim() as ConversationDifficulty;
    if (!theme || !starter || !['intro', 'basic', 'intermediate', 'advanced'].includes(difficulty)) {
        return null;
    }

    const followList = Array.isArray(candidate.followUps)
        ? candidate.followUps
        : String(candidate.followUps ?? '')
            .split('\n')
            .map((item: string) => item.trim())
            .filter(Boolean);
    const followUps = followList
        .map((item: any) => String(item ?? '').trim())
        .filter(Boolean);
    if (!followUps.length) {
        return null;
    }

    const keywordList = Array.isArray(candidate.keywords)
        ? candidate.keywords
        : String(candidate.keywords ?? '')
            .split(',')
            .map((item: string) => item.trim())
            .filter(Boolean);
    const keywords = keywordList
        .map((item: any) => String(item ?? '').trim())
        .filter(Boolean);

    const culturalNotesValue = candidate.culturalNotes;
    const culturalNotes = culturalNotesValue ? String(culturalNotesValue).trim() : undefined;

    return {
        theme,
        starter,
        difficulty,
        followUps,
        keywords,
        ...(culturalNotes ? { culturalNotes } : {}),
    };
};

const normaliseTopics = (raw: unknown): Record<CEFRLevel, ConversationTopic[]> | null => {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const input = raw as Record<string, unknown>;
    const result = cloneFallbackTopics();
    let hasCustomData = false;

    for (const level of CEFR_LEVELS) {
        const payload = input[level];
        if (Array.isArray(payload)) {
            const cleaned = payload
                .map(sanitiseTopic)
                .filter((topic): topic is ConversationTopic => topic !== null);
            result[level] = cleaned;
            hasCustomData = true;
        }
    }

    return hasCustomData ? result : null;
};

type DynamicTopicCacheEntry = {
    topic: ConversationTopic;
    meta: TopicsMeta;
    expiresAt: number;
};

const dynamicTopicCache = new Map<CEFRLevel, DynamicTopicCacheEntry>();

const DYNAMIC_TOPIC_CACHE_TTL_MS = 3 * 60 * 1000;
const MAX_DYNAMIC_TOPIC_ATTEMPTS = 2;

const normaliseTheme = (value: string): string => value.trim().toLowerCase();

const buildDynamicTopicPrompt = (level: CEFRLevel, excludeThemes: string[]): string => {
    const summary = CEFR_LEVEL_SUMMARY[level];
    const targetDifficulty = LEVEL_TO_DIFFICULTY[level] ?? 'intermediate';
    const bannedList = excludeThemes.length
        ? excludeThemes.map(theme => `- ${theme}`).join('\n')
        : '';

    return [
        'Je bent een creatieve taaldidacticus voor een Nederlandse tutor.',
        `Doelgroep: Spaanstalige leerling op CEFR-niveau ${level}.`,
        `Profiel: ${summary}`,
        'Ontwerp één fris gespreksonderwerp dat nog niet eerder is gebruikt.',
        'Lever het resultaat in het Nederlands als JSON met de velden theme, starter, followUps (exact 3), keywords (3-6 termen) en optioneel culturalNotes.',
        'Vereisten:',
        `- Zorg dat taalcomplexiteit en woordenschat passen bij niveau ${level}.`,
        `- Gebruik moeilijkheid "${targetDifficulty}".`,
        '- Formuleer starter en vervolgvragen als natuurlijke, open vragen.',
        '- Voeg minimaal drie relevante trefwoorden toe.',
        "- Geef culturalNotes alleen wanneer zinvol (bijv. cross-culturele toelichting).",
        bannedList
            ? `Vermijd onderwerpen die sterk lijken op onderstaande thema's:\n${bannedList}`
            : "Vermijd herhaling van eerder gebruikte thema's.",
        'Antwoord uitsluitend met JSON (geen extra tekst).',
    ].join('\n');
};

type GenerateDynamicTopicOptions = {
    excludeThemes?: string[];
};

export const generateDynamicConversationTopic = async (
    level: CEFRLevel,
    options: GenerateDynamicTopicOptions = {},
): Promise<{ topic: ConversationTopic; meta: TopicsMeta }> => {
    const excludeThemes = Array.from(
        new Set((options.excludeThemes ?? []).map(normaliseTheme).filter(Boolean)),
    );

    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_DYNAMIC_TOPIC_ATTEMPTS; attempt += 1) {
        try {
            const prompt = buildDynamicTopicPrompt(level, excludeThemes);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: AI_TOPIC_SCHEMA,
                    temperature: 0.6,
                },
            });

            const rawText = response.text ?? '';
            const payload = JSON.parse(rawText) as {
                theme?: string;
                starter?: string;
                followUps?: string[];
                keywords?: string[];
                difficulty?: ConversationDifficulty;
                culturalNotes?: string | null;
            };

            const targetDifficulty = LEVEL_TO_DIFFICULTY[level] ?? 'intermediate';
            const rawKeywords = Array.isArray(payload.keywords) ? payload.keywords : [];
            const fallbackKeywords =
                rawKeywords.length > 0
                    ? rawKeywords
                    : (payload.theme ?? '')
                        .split(/\s+/)
                        .map(item => item.trim())
                        .filter(Boolean)
                        .slice(0, 4);

            const candidate = {
                theme: payload.theme ?? '',
                starter: payload.starter ?? '',
                followUps: Array.isArray(payload.followUps) ? payload.followUps : [],
                keywords: fallbackKeywords,
                difficulty: payload.difficulty ?? targetDifficulty,
                culturalNotes: payload.culturalNotes ?? undefined,
            };

            const cleaned = sanitiseTopic(candidate);
            if (!cleaned) {
                throw new Error('Onvolledige of ongeldige topicrespons.');
            }

            if (!cleaned.keywords.length) {
                cleaned.keywords = fallbackKeywords;
            }

            if (!cleaned.keywords.length) {
                cleaned.keywords = cleaned.theme
                    .split(/\s+/)
                    .map(part => part.trim())
                    .filter(Boolean)
                    .slice(0, 3);
            }

            const meta: TopicsMeta = {
                source: 'ai',
                timestamp: Date.now(),
                statusCode: null,
                error: null,
            };

            logEvent('topics', 'Dynamic topic generated', {
                data: {
                    level,
                    theme: cleaned.theme,
                    difficulty: cleaned.difficulty,
                    attempt: attempt + 1,
                },
            });

            return { topic: cleaned, meta };
        } catch (error) {
            lastError = error;
            logEvent('topics', 'Dynamic topic generation attempt failed', {
                level: 'warn',
                data: {
                    level,
                    attempt: attempt + 1,
                    message: error instanceof Error ? error.message : String(error),
                },
            });
        }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError ?? 'Onbekende fout'));
};

const readStoredTopics = (): Record<CEFRLevel, ConversationTopic[]> | null => {
    if (!isBrowserEnvironment) {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(TOPICS_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        return normaliseTopics(parsed);
    } catch (error) {
        console.warn('[topics] Kon custom topics niet lezen:', error);
        return null;
    }
};

const persistCustomTopics = (topics: Record<CEFRLevel, ConversationTopic[]> | null) => {
    if (!isBrowserEnvironment) {
        return;
    }
    if (topics) {
        window.localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(topics));
    } else {
        window.localStorage.removeItem(TOPICS_STORAGE_KEY);
    }
};

export const resetTopicsCache = () => {
    topicsCache = null;
    topicsMeta = null;
    dynamicTopicCache.clear();
};

export const loadConversationTopics = async (): Promise<Record<CEFRLevel, ConversationTopic[]>> => {
    if (topicsCache) {
        return topicsCache;
    }

    const stored = readStoredTopics();
    if (stored) {
        topicsCache = stored;
        topicsMeta = {
            source: 'local',
            timestamp: Date.now(),
            statusCode: null,
            error: null,
        };
        return topicsCache;
    }

    topicsCache = cloneFallbackTopics();
    topicsMeta = {
        source: 'fallback',
        timestamp: Date.now(),
        statusCode: null,
        error: null,
    };
    return topicsCache;
};

export const getTopicsMeta = (): TopicsMeta | null => topicsMeta;

export const saveCustomTopics = (payload: unknown): Record<CEFRLevel, ConversationTopic[]> => {
    const normalised = normaliseTopics(payload);
    if (!normalised) {
        throw new Error('Ongeldig topics-formaat. Controleer de structuur en probeer opnieuw.');
    }
    persistCustomTopics(normalised);
    topicsCache = normalised;
    topicsMeta = {
        source: 'local',
        timestamp: Date.now(),
        statusCode: null,
        error: null,
    };
    return topicsCache;
};

export const clearCustomTopics = () => {
    persistCustomTopics(null);
    resetTopicsCache();
};

export const getFallbackTopics = (): Record<CEFRLevel, ConversationTopic[]> => cloneFallbackTopics();

export const pickConversationTopic = async (
    level: CEFRLevel,
    excludeThemes: string[] = [],
): Promise<{ topic: ConversationTopic; meta: TopicsMeta | null }> => {
    const normalizedExcludes = excludeThemes.map(normaliseTheme).filter(Boolean);
    const excludeSet = new Set(normalizedExcludes);
    const now = Date.now();

    const cached = dynamicTopicCache.get(level);
    if (cached) {
        const cachedTheme = normaliseTheme(cached.topic.theme);
        if (cached.expiresAt > now && !excludeSet.has(cachedTheme)) {
            topicsMeta = cached.meta;
            logEvent('topics', 'Dynamic topic served from cache', {
                data: {
                    level,
                    theme: cached.topic.theme,
                },
            });
            return { topic: cached.topic, meta: cached.meta };
        }
        dynamicTopicCache.delete(level);
    }

    try {
        const { topic, meta } = await generateDynamicConversationTopic(level, { excludeThemes });
        const expiresAt = (meta.timestamp ?? Date.now()) + DYNAMIC_TOPIC_CACHE_TTL_MS;
        dynamicTopicCache.set(level, { topic, meta, expiresAt });
        topicsMeta = meta;
        return { topic, meta };
    } catch (error) {
        logEvent('topics', 'Dynamic topic generation exhausted', {
            level: 'warn',
            data: {
                level,
                message: error instanceof Error ? error.message : String(error),
            },
        });
    }

    const topics = await loadConversationTopics();
    const bank = topics[level];
    const source = bank && bank.length > 0 ? bank : FALLBACK_TOPICS[level];
    if (!source || source.length === 0) {
        const fallbackMeta: TopicsMeta = {
            source: 'fallback',
            timestamp: Date.now(),
            statusCode: null,
            error: 'Geen onderwerpen beschikbaar.',
        };
        topicsMeta = fallbackMeta;
        return { topic: FALLBACK_CONVERSATION_CONTEXT, meta: fallbackMeta };
    }

    const candidates = source.filter(topic => !excludeSet.has(normaliseTheme(topic.theme)));
    const scopedList = candidates.length > 0 ? candidates : source;
    const index = Math.floor(Math.random() * scopedList.length);
    const chosen = scopedList[index] ?? FALLBACK_CONVERSATION_CONTEXT;
    const meta = topicsMeta ?? {
        source: 'fallback',
        timestamp: Date.now(),
        statusCode: null,
        error: null,
    };
    return { topic: chosen, meta };
};

const NEWS_SUMMARY_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: 'Korte uitleg van het nieuwsbericht in helder Nederlands, afgestemd op het niveau.',
        },
        starter: {
            type: Type.STRING,
            description: 'Een vriendelijke openingsvraag gericht op het onderwerp.',
        },
        followUps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Drie vervolgvragen om het gesprek te verdiepen.',
        },
        keywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            nullable: true,
            description: 'Belangrijke woorden of uitdrukkingen die bij het nieuws horen.',
        },
    },
    required: ['summary', 'starter', 'followUps'],
} as const;

export const summarizeNewsForLevel = async (
    level: CEFRLevel,
    entry: NewsFeedEntry,
): Promise<NewsConversationTopic> => {
    const difficulty = LEVEL_TO_DIFFICULTY[level] ?? 'intermediate';
    const sourceNote = buildSourceNote(entry);
    const publishedAt = entry.publishedAt ?? null;
    const articleUrl = entry.headlineUrl ?? entry.sourceUrl;
    const baseSummaryText =
        entry.summary && entry.summary.trim().length > 0
            ? entry.summary.trim()
            : `Kort nieuwsbericht van ${entry.sourceName}.`;

    const fallbackTopic: NewsConversationTopic = {
        headline: entry.title,
        theme: entry.title,
        starter: `Wat vind jij van het nieuws over "${entry.title}"?`,
        followUps: fallbackFollowUps(entry.title),
        difficulty,
        keywords: fallbackKeywords(entry),
        summaryText: baseSummaryText,
        sourceNote,
        sourceName: entry.sourceName,
        sourceUrl: entry.sourceUrl,
        articleUrl,
        publishedAt,
    };

    const levelInstruction = NEWS_LEVEL_INSTRUCTIONS[level];
    const dateLabel = formatDutchDate(entry.publishedAt) ?? 'onbekende datum';
    const request = [
        `Nieuwsbericht:`,
        `Titel: ${entry.title}`,
        `Bron: ${entry.sourceName}`,
        `Datum: ${dateLabel}`,
        `Korte beschrijving: ${baseSummaryText}`,
        '',
        `Schrijf een korte samenvatting en gespreksstarter voor een Nederlands gesprek met een leerling op niveau ${level}.`,
        levelInstruction,
        'Gebruik het Nederlands en houd de toon vriendelijk.',
        'Geef het antwoord als JSON-object met de velden "summary", "starter", "followUps" (3 items) en optioneel "keywords".',
    ].join('\n');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: request,
            config: {
                responseMimeType: 'application/json',
                responseSchema: NEWS_SUMMARY_SCHEMA,
            },
        });

        const payloadRaw = response.text ?? '';
        const payload = JSON.parse(payloadRaw) as {
            summary?: string;
            starter?: string;
            followUps?: string[];
            keywords?: string[];
        };

        const summaryText =
            typeof payload.summary === 'string' && payload.summary.trim().length > 0
                ? payload.summary.trim()
                : fallbackTopic.summaryText;
        const starter =
            typeof payload.starter === 'string' && payload.starter.trim().length > 0
                ? payload.starter.trim()
                : fallbackTopic.starter;
        const followUps =
            Array.isArray(payload.followUps) && payload.followUps.length > 0
                ? payload.followUps
                    .map(item => (typeof item === 'string' ? item.trim() : String(item).trim()))
                    .filter(Boolean)
                    .slice(0, 3)
                : fallbackTopic.followUps;
        const keywords =
            Array.isArray(payload.keywords) && payload.keywords.length > 0
                ? payload.keywords
                    .map(item => (typeof item === 'string' ? item.trim() : String(item).trim()))
                    .filter(Boolean)
                    .slice(0, 6)
                : fallbackTopic.keywords;

        return {
            ...fallbackTopic,
            summaryText,
            starter,
            followUps,
            keywords,
        };
    } catch (error) {
        logEvent('news', 'News summary generation failed', {
            level: 'warn',
            data: {
                source: entry.sourceName,
                message: error instanceof Error ? error.message : String(error),
            },
        });
        return fallbackTopic;
    }
};

export type SessionContextExtras = {
    topic?: ConversationTopic | null;
    creative?: CreativeWorkshopState | null;
};

type SystemInstructionParams = {
    level: CEFRLevel;
    activity: ActivityMode;
    goals?: LearningGoal[];
    strictness?: FeedbackStrictnessSettings | null;
    topic?: ConversationTopic | null;
    creative?: CreativeWorkshopState | null;
    isIntro?: boolean;
};

export const GOAL_INSTRUCTIONS: Record<LearningGoal, string> = {
    fluency: 'Zorg dat de leerling veel spreekt; stel doorvragen en help met verbindingswoorden. Geef feedback op tempo en zinsritme.',
    vocabulary: 'Benadruk nieuwe woordenschat. Introduceer relevante woorden uit het thema en vraag de leerling ze actief te gebruiken. Corrigeer zachtjes en bied synoniemen.',
    listening: 'Spreek rustig en duidelijk. Controleer begrip door de leerling te laten parafraseren en stel vragen over details.',
    pronunciation: 'Focus op klanken, klemtoon en intonatie. Modelleer moeilijke woorden en laat de leerling ze nazeggen met fonetische tips.',
    'grammar-accuracy': 'Leg nadruk op correcte zinsbouw en werkwoordstijden. Corrigeer fouten met korte uitleg en vraag om herhaling van de verbeterde zin.',
    confidence: 'Geef expliciete, positieve feedback. Laat ruimte voor langere beurten en normaliseer fouten zodat de leerling durft te experimenteren.',
    'interaction-strategies': 'Stimuleer beurtwisseling, verduidelijkingsvragen en reacties op de gesprekspartner. Modelleer gespreksfrasen en laat de leerling ze toepassen.',
    'cultural-awareness': 'Let op toon en beleefdheidsvormen. Leg culturele keuzes uit en bied alternatieve formuleringen die beter passen bij de Nederlandse context.',
    'exam-prep': 'Simuleer examenvragen met tijdsdruk. Geef concrete tips over beoordelingscriteria en vraag om compacte, gestructureerde antwoorden.',
    'business-dutch': 'Gebruik een formeel register en relevant vakjargon. Corrigeer ongepaste toon en help bij het formuleren van professionele uitdrukkingen.',
};

const CEFR_CORRECTION_GUIDANCE: Record<CEFRLevel, string> = {
    A1: 'Gebruik vertrouwde contexten, spreek langzaam en duidelijk en herhaal kernwoorden. Corrigeer vooral wanneer betekenis verloren gaat en bied eenvoudige herformuleringen en voorbeeldzinnen.',
    A2: 'Blijf bij alledaagse situaties en gebruik eenvoudige zinnen. Corrigeer basisgrammatica zacht, parafraseer belangrijke uitdrukkingen en benadruk veelgebruikte patronen.',
    B1: 'Help de leerling om ervaringen en meningen samenhangend te verwoorden. Geef feedback op zinsverbindingen, redenaties en vertelstructuur met korte uitleg voor grammaticale verbeteringen.',
    B2: 'Vraag naar nuance, argumenten en spontane reacties. Introduceer complexere structuren, corrigeer register- en grammaticafouten direct en licht alternatieve formuleringen toe.',
    C1: 'Werk aan precisie, idiomatische variatie en professionele flexibiliteit. Benoem subtiele fouten in toon of structuur en vraag de leerling om het verbeterde antwoord direct te herhalen.',
    C2: 'Richt je op verfijnde betekenisnuances, idiomen en stijl. Corrigeer zelfs kleine onnauwkeurigheden, vraag naar zelfcorrectie en stimuleer analytische reflectie over woordkeuze.',
};

const SPOKEN_ACTIVITY_MODES: Set<ActivityMode> = new Set<ActivityMode>([
    'conversation',
    'job-interview',
    'making-complaint',
    'expressing-opinion',
    'giving-instructions',
    'listen-summarize',
    'tongue-twisters',
    'creative-improvisation',
    'creative-story-relay',
    'creative-escape-room',
    'creative-emotion-barometer',
    'creative-keyword-wheel',
    'proverbs-sayings',
    'culture',
]);

const STRICTNESS_INTENSITY: Record<StrictnessLevel, string> = {
    1: 'Corrigeer alleen wanneer het begrip stokt en bied vooral zachte hints of herformuleringen.',
    2: 'Corrigeer spaarzaam met korte voorbeelden en moedig de leerling aan om zelf de verbetering te zoeken.',
    3: 'Corrigeer regelmatig met duidelijke uitleg en laat de leerling de verbeterde zin herhalen.',
    4: 'Corrigeer vrijwel elke fout direct, vraag om onmiddellijke herhaling en geef concrete verbeterstrategieën.',
    5: 'Corrigeer elke fout onmiddellijk, vraag de leerling het juiste antwoord uit te spreken en bouw korte correctiedrills in.',
};

const ASPECT_FOCUS: Record<FeedbackAspect, string> = {
    grammar: 'Let op zinsbouw, woordvolgorde, werkwoordstijden en congruentie.',
    pronunciation: 'Let op klinkers, medeklinkers, klemtoon en intonatie; geef klankvoorbeelden indien nodig.',
    fluency: 'Houd tempo, ritme en het vermijden van lange pauzes in de gaten; bied verbindingswoorden aan.',
    vocabulary: 'Focus op woordkeuze, collocaties en hergebruik van nieuw vocabulaire in natuurlijke context.',
    tone: 'Let op beleefdheidsvormen, register en culturele gepastheid van uitdrukkingen.',
};

const describeStrictnessSettings = (strictness: FeedbackStrictnessSettings): string => {
    const parts: string[] = [];
    for (const aspect of FEEDBACK_ASPECTS) {
        const level = strictness[aspect];
        if (!level) {
            continue;
        }
        const focus = ASPECT_FOCUS[aspect];
        const intensity = STRICTNESS_INTENSITY[level];
        const label =
            aspect === 'tone'
                ? 'Toon & beleefdheid'
                : aspect === 'grammar'
                    ? 'Grammatica'
                    : aspect === 'pronunciation'
                        ? 'Uitspraak'
                        : aspect === 'fluency'
                            ? 'Vloeiendheid'
                            : 'Woordenschat';
        parts.push(`${label}: ${focus} ${intensity}`);
    }
    return parts.join(' ');
};

const describeKeywords = (keywords: string[]) => {
    if (!keywords.length) return '';
    if (keywords.length === 1) return keywords[0];
    const head = keywords.slice(0, -1).join(', ');
    return `${head} en ${keywords[keywords.length - 1]}`;
};

const previewList = (items: string[], max = 3) => {
    if (!items || items.length === 0) {
        return '';
    }
    const selection = items.slice(0, max);
    const suffix = items.length > max ? ' ...' : '';
    return `${selection.join('; ')}${suffix}`;
};

const joinSegments = (...parts: Array<string | undefined | null>) =>
    parts
        .map(part => (part ?? '').trim())
        .filter(part => part.length > 0)
        .join(' ');

const describeCreativeWorkshop = (creative?: CreativeWorkshopState | null) => {
    if (!creative) {
        return '';
    }
    const { mode, config, setup } = creative;
    if (!setup) {
        return 'Creatieve context: er is nog geen gedetailleerde setup geladen. Gebruik de gekozen parameters om zelf scènes of opdrachten aan te reiken.';
    }

    const setupJson = JSON.stringify(setup);

    switch (mode) {
        case 'creative-improvisation': {
            const improvConfig = config as CreativeActivityConfigMap['creative-improvisation'];
            const improvSetup = setup as CreativeActivitySetupMap['creative-improvisation'];
            const roleCards = improvSetup.roleCards.map(card => {
                const extras = [card.emotion, `locatie: ${card.location}`];
                if (card.prop) extras.push(`prop: ${card.prop}`);
                if (card.twist) extras.push(`twist: ${card.twist}`);
                return `${card.role} (${extras.join(', ')})`;
            });
            const warmUps = previewList(improvSetup.warmUps);
            const scenes = previewList(improvSetup.sceneSeeds);
            const tips = previewList(improvSetup.coachingTips, 2);
            const reflections = previewList(improvSetup.reflectionPrompts);
            return joinSegments(
                `Plan ${improvConfig.rounds} ronde(n) improvisatie.`,
                warmUps ? `Warm-up: ${warmUps}.` : undefined,
                roleCards.length ? `Rolkaarten: ${previewList(roleCards)}.` : undefined,
                scenes ? `Scènehaakjes: ${scenes}.` : undefined,
                tips ? `Coachingtips: ${tips}.` : undefined,
                reflections ? `Reflectievragen: ${reflections}.` : undefined,
                `ContextJSON: ${setupJson}`
            );
        }
        case 'creative-story-relay': {
            const storyConfig = config as CreativeActivityConfigMap['creative-story-relay'];
            const storySetup = setup as CreativeActivitySetupMap['creative-story-relay'];
            const beats = previewList(storySetup.narrativeBeats);
            const twists = previewList(storySetup.twistCards);
            const genres = previewList(storySetup.genreSuggestions);
            const wrapUps = previewList(storySetup.wrapUpPrompts);
            const twistInstruction = storyConfig.allowTwists && twists
                ? `Voeg optioneel twists toe zoals ${twists}.`
                : 'Gebruik twists alleen wanneer de groep vastloopt.';
            return joinSegments(
                `Open met "${storySetup.openingLine}".`,
                beats ? `Plotvolgorde: ${beats}.` : undefined,
                twistInstruction,
                genres ? `Aanbevolen genres: ${genres}.` : undefined,
                wrapUps ? `Afronden met: ${wrapUps}.` : undefined,
                `ContextJSON: ${setupJson}`
            );
        }
        case 'creative-escape-room': {
            const escapeConfig = config as CreativeActivityConfigMap['creative-escape-room'];
            const escapeSetup = setup as CreativeActivitySetupMap['creative-escape-room'];
            const puzzleDescriptions = escapeSetup.puzzles.map((puzzle, index) => {
                const hintNote = puzzle.hint ? `, hint: ${puzzle.hint}` : '';
                return `Puzzel ${index + 1} (${puzzle.languageFocus}): ${puzzle.clue}${hintNote}`;
            });
            const puzzles = previewList(puzzleDescriptions);
            const tips = previewList(escapeSetup.supportTips);
            const hintPolicy = escapeConfig.allowHints
                ? 'Geef hints wanneer teams vastlopen; gebruik de meegeleverde suggesties.'
                : 'Geef geen hints tenzij absoluut nodig; laat cursisten redeneren.';
            return joinSegments(
                `Scenario: ${escapeSetup.scenario}.`,
                `Tijdslimiet: ${escapeSetup.timeLimitMinutes} minuten.`,
                puzzles ? `Puzzels: ${puzzles}.` : undefined,
                `Finale: ${escapeSetup.finale}.`,
                tips ? `Differentiatie: ${tips}.` : undefined,
                hintPolicy,
                `ContextJSON: ${setupJson}`
            );
        }
        case 'creative-emotion-barometer': {
            const emotionConfig = config as CreativeActivityConfigMap['creative-emotion-barometer'];
            const emotionSetup = setup as CreativeActivitySetupMap['creative-emotion-barometer'];
            const sentences = previewList(emotionSetup.neutralSentences);
            const cards = previewList(emotionSetup.emotionCards.map(card => `${card.emotion} (${card.vocalStyle})`));
            const checklist = previewList(emotionSetup.feedbackChecklist);
            const reflections = previewList(emotionSetup.reflectionQuestions);
            return joinSegments(
                emotionConfig.emotionCount ? `Voorzie ${emotionConfig.emotionCount} emotiekaarten.` : undefined,
                sentences ? `Start met zinnen zoals: ${sentences}.` : undefined,
                cards ? `Variaties: ${cards}.` : undefined,
                checklist ? `Checklist: ${checklist}.` : undefined,
                reflections ? `Reflectie: ${reflections}.` : undefined,
                `ContextJSON: ${setupJson}`
            );
        }
        case 'creative-keyword-wheel': {
            const wheelConfig = config as CreativeActivityConfigMap['creative-keyword-wheel'];
            const wheelSetup = setup as CreativeActivitySetupMap['creative-keyword-wheel'];
            const sliceSummaries = wheelSetup.slices.map(slice => {
                const keywords = previewList(slice.keywords, 2);
                const challengeNote = slice.challenge ? `, challenge: ${slice.challenge}` : '';
                return `${slice.label}: ${keywords}${challengeNote}`;
            });
            const slices = previewList(sliceSummaries);
            const followUps = previewList(wheelSetup.followUpTasks);
            const collabs = previewList(wheelSetup.collaborativeGames);
            return joinSegments(
                `Bereid ${wheelSetup.slices.length} segment(en) voor het rad.`,
                slices ? `Segmenten: ${slices}.` : undefined,
                followUps ? `Na elke spin: ${followUps}.` : undefined,
                collabs ? `Samenwerking: ${collabs}.` : undefined,
                wheelConfig.includeMiniChallenges ? 'Voeg mini-challenges toe wanneer het rad hierom vraagt.' : undefined,
                `ContextJSON: ${setupJson}`
            );
        }
        default:
            return `Creatieve context: ${setupJson}`;
    }
};

const buildTopicPromptContext = (topic?: ConversationTopic | null): string => {
    if (!topic) {
        return '';
    }

    const lines: string[] = [];
    lines.push(`Gespreksonderwerp: ${topic.theme}.`);
    if (topic.starter?.trim()) {
        lines.push(`Openingsvraag: ${topic.starter}`);
    }
    if (topic.followUps?.length) {
        const followUps = topic.followUps.map(item => item.trim()).filter(Boolean);
        if (followUps.length) {
            lines.push(`Vervolgvragen: ${followUps.join(' | ')}`);
        }
    }
    if (topic.keywords?.length) {
        lines.push(`Belangrijke woorden: ${topic.keywords.join(', ')}.`);
    }

    const maybeNewsTopic = topic as Partial<NewsConversationTopic>;
    if (typeof maybeNewsTopic.summaryText === 'string' && maybeNewsTopic.summaryText.trim().length > 0) {
        lines.push(`Nieuws-samenvatting: ${maybeNewsTopic.summaryText}`);
        if (maybeNewsTopic.sourceNote?.trim()) {
            lines.push(`Bronvermelding: ${maybeNewsTopic.sourceNote}`);
        } else if (maybeNewsTopic.sourceName?.trim()) {
            lines.push(`Bron: ${maybeNewsTopic.sourceName}`);
        }
        if (maybeNewsTopic.articleUrl?.trim()) {
            lines.push(`Bronlink: ${maybeNewsTopic.articleUrl}`);
        }
        lines.push('Verwijs expliciet naar dit nieuwsbericht en benadruk dat informatie kan veranderen.');
    } else {
        lines.push('Zorg dat dit onderwerp expliciet in de introductie terugkomt.');
    }
    lines.push('Eindig met een open vraag die de leerling uitnodigt om op dit onderwerp te reageren.');

    return lines.join('\n');
};

const getSystemInstruction = ({
    level,
    activity,
    goals = [],
    strictness = null,
    topic,
    creative,
    isIntro = false,
}: SystemInstructionParams): string => {
    const baseInstruction = `Je bent een geduldige en vriendelijke Nederlandse taaltutor. De gebruiker is een Spaanstalige die Nederlands leert op CEFR-niveau ${level}. De oefening van vandaag is "${activity}". Pas je taalgebruik en spreeksnelheid aan op het niveau van de gebruiker. Geef korte, duidelijke feedback.`;
    const resolvedGoals: LearningGoal[] = goals.length ? [...new Set(goals)] : (['fluency'] as LearningGoal[]);
    const primaryGoal: LearningGoal = resolvedGoals[0] ?? 'fluency';
    const goalGuidance = resolvedGoals
        .map(goalKey => GOAL_INSTRUCTIONS[goalKey])
        .filter(Boolean)
        .join(' ');
    const cefrGuidance = CEFR_CORRECTION_GUIDANCE[level] ?? '';
    const goalLabels = resolvedGoals
        .map(goalKey => LEARNING_GOAL_METADATA[goalKey]?.label ?? goalKey)
        .join(', ');
    const goalReminder = resolvedGoals.length ? `Actieve leerdoelen: ${goalLabels}.` : '';
    const strictnessGuidance =
        strictness && SPOKEN_ACTIVITY_MODES.has(activity)
            ? `Correctiestrictheid: ${describeStrictnessSettings(strictness)}`
            : '';

    const activityInstructions: Record<ActivityMode, string> = {
        'conversation': 'Jij bent een vriendelijke gesprekspartner. Gebruik altijd het aangeleverde gespreksonderwerp (bijvoorbeeld een nieuwsartikel) en blijf daarbij. Begin met een open vraag over dit onderwerp en laat de gebruiker het gesprek sturen.',
        'vocabulary': 'Jij bent een woordenschatcoach. Introduceer een nieuw Nederlands woord, geef de Spaanse vertaling en een voorbeeldzin. Vraag de gebruiker dan om zelf een zin met het woord te maken.',
        'grammar': 'Jij bent een grammaticadocent. Vraag de gebruiker welke grammaticaregel ze willen leren. Geef een duidelijke, eenvoudige uitleg met voorbeelden. Stel daarna een vraag om hun begrip te testen.',
        'culture': 'Jij bent een cultuurgids. Deel een interessant en kort weetje over de Nederlandse cultuur, geschiedenis of tradities. Stel daarna een open vraag om een gesprek te starten.',
        'job-interview': 'Jij bent een HR-manager die een sollicitatiegesprek afneemt in het Nederlands. Stel de gebruiker vragen over hun ervaring en motivatie. Wees professioneel maar vriendelijk.',
        'making-complaint': 'Jij bent een medewerker van de klantenservice. De gebruiker heeft een klacht. Vraag naar de details en probeer een oplossing te vinden. Blijf beleefd, ook als de gebruiker gefrustreerd is.',
        'expressing-opinion': 'Jij bent een discussiepartner. Geef de gebruiker een stelling (bijv. "Huisdieren zouden verboden moeten worden in de stad") en vraag naar hun mening. Vraag door en geef tegenargumenten.',
        'giving-instructions': 'Je bent een vriend die niet weet hoe iets moet. Vraag de gebruiker om stapsgewijze instructies voor een taak (bijv. "een ei koken" of "een plant verpotten"). Vraag om opheldering als iets onduidelijk is.',
        'listen-summarize': 'Vertel een kort, eenvoudig verhaal (ongeveer 5-7 zinnen) in het Nederlands. Vraag de gebruiker daarna om het verhaal in hun eigen woorden samen te vatten. Geef feedback op hun samenvatting.',
        'extra-practice': 'Jij bent een flexibele taaltutor. Ondersteun de gebruiker bij hun specifieke oefenwens. Vraag wat ze willen oefenen als dat nog niet duidelijk is, en pas je werkvorm daarop aan.',
        'tongue-twisters': 'Geef de gebruiker een klassieke Nederlandse tongbreker (bijv. "De kat krabt de krullen van de trap"). Vraag hen om het na te zeggen. Geef ze er een paar en moedig ze aan.',
        'sentence-puzzle': 'Geef de gebruiker een reeks losse Nederlandse woorden die een zin kunnen vormen. Vraag hen om de woorden in de juiste volgorde te zetten. Begin eenvoudig en maak het geleidelijk moeilijker.',
        'creative-improvisation': 'Je bent spelbegeleider van improvisatierondes. Leg de spelregels kort uit, activeer iedereen en geef positieve taalfeedback tijdens het spelen.',
        'creative-story-relay': 'Je begeleidt een verhalenestafette. Bewaak het tempo, help bij verbindingswoorden en stimuleer dat deelnemers op elkaar reageren.',
        'creative-escape-room': 'Je bent gamemaster van een taal-escape room. Schets het scenario, bewaak de tijd en geef taalgerichte hints wanneer nodig.',
        'creative-emotion-barometer': 'Je leidt een emotie-oefening. Demonstreer intonatie en lichaamstaal en laat cursisten varianten analyseren.',
        'creative-keyword-wheel': 'Je faciliteert een trefwoordenrad. Kondig spins aan, leg de opdrachten uit en zorg dat iedereen kort reageert.',
        'proverbs-sayings': 'Jij bent een Nederlandse taalcoach. Introduceer een Nederlands spreekwoord (bijv. "De appel valt niet ver van de boom"). Leg de betekenis uit en vraag de gebruiker om een situatie te bedenken waarin ze het zouden kunnen gebruiken.'
    };

    let conversationDetail = '';
    if (activity === 'conversation') {
        const context = topic ?? FALLBACK_CONVERSATION_CONTEXT;
        const isNewsTopic = typeof (context as Partial<NewsConversationTopic>).summaryText === 'string';
        const newsContext = isNewsTopic ? (context as NewsConversationTopic) : null;
        const followUpText = context.followUps
            .map((question, idx) => `${idx + 1}. ${question}`)
            .join(' ');
        const difficultyLabel = context.difficulty === 'intro' ? 'instapniveau' :
            context.difficulty === 'basic' ? 'basisniveau' :
                context.difficulty === 'intermediate' ? 'gevorderd niveau' :
                    'verdiepend niveau';
        const keywordList = describeKeywords(context.keywords);
        const culturalNote = context.culturalNotes ? `Verwerk ook deze culturele hint: ${context.culturalNotes}.` : '';
        conversationDetail = joinSegments(
            `Gebruik het thema "${context.theme}" (${difficultyLabel}).`,
            `Belangrijke trefwoorden: ${keywordList}.`,
            newsContext ? `Vat het nieuwsbericht kort samen voor de leerling: ${newsContext.summaryText}.` : undefined,
            newsContext ? `Geef eerst expliciet deze bronvermelding: ${newsContext.sourceNote}` : undefined,
            `Begin met de vraag: "${context.starter}".`,
            followUpText ? `Gebruik deze vervolgvragen om het gesprek te verdiepen: ${followUpText}.` : '',
            culturalNote,
            'Spiegel het spreeksnelheid van de leerling en vraag door bij korte antwoorden.'
        );
    }

    let cultureDetail = '';
    if (activity === 'culture') {
        const {
            prompt: culturePrompt,
            selectedMiniTask,
            alternativeMiniTasks,
            goalAdaptation,
        } = pickCulturePrompt(level, primaryGoal);
        const followUpText = culturePrompt.followUps
            .map((question, idx) => `${idx + 1}. ${question}`)
            .join(' ');
        const alternativeMiniTaskText = alternativeMiniTasks.length
            ? alternativeMiniTasks
                .map((task, idx) => `${idx + 1}. ${task}`)
                .join(' ')
            : '';
        cultureDetail = joinSegments(
            `Cultureel thema: ${culturePrompt.topic}.`,
            `Deel dit weetje: ${culturePrompt.fact}`,
            followUpText ? `Gebruik vervolgvragen zoals: ${followUpText}.` : '',
            `Kies één mini-opdracht voor nu: ${selectedMiniTask}.`,
            alternativeMiniTaskText ? `Varieer later met opdrachten zoals: ${alternativeMiniTaskText}.` : '',
            culturePrompt.vocabularyHints?.length
                ? `Leg eventuele onbekende woorden uit, zoals ${describeKeywords(culturePrompt.vocabularyHints)}.`
                : '',
            goalAdaptation,
        );
    }

    const creativeDetail = describeCreativeWorkshop(creative);

    const action = isIntro
        ? 'Start de conversatie met een korte, gastvrije verwelkoming en leg daarna duidelijk uit wat je van de gebruiker verwacht tijdens deze oefening.'
        : (topic ? 'BELANGRIJK: Begin ONMIDDELLIJK met praten zodra deze sessie start. Stel direct de openingsvraag zonder te wachten op user input. Wacht NIET - begin meteen met spreken.' : 'BELANGRIJK: Begin ONMIDDELLIJK met praten zodra deze sessie start. Start direct met een verwelkoming en vraag wat de gebruiker wil oefenen. Wacht NIET - begin meteen met spreken.');

    const instruction = joinSegments(
        baseInstruction,
        cefrGuidance,
        activityInstructions[activity],
        goalReminder,
        conversationDetail,
        cultureDetail,
        creativeDetail,
        strictnessGuidance,
        goalGuidance,
        action
    );
    return instruction;
};

/**
 * Generates a spoken introduction using a fast, non-streaming API call.
 */
export const generateIntroduction = async (
    level: CEFRLevel,
    activity: ActivityMode,
    goals: LearningGoal[],
    strictness: FeedbackStrictnessSettings,
    extras: SessionContextExtras = {}
): Promise<{ text: string, audio: string }> => {
    const { topic = null, creative = null } = extras;
    const topicContextBlock = buildTopicPromptContext(topic);
    const maybeNewsTopic = topic && 'summaryText' in topic ? (topic as NewsConversationTopic) : null;
    const rawHeadline = maybeNewsTopic?.headline ?? topic?.theme ?? 'het gespreksonderwerp';
    const headlineLabel =
        typeof rawHeadline === 'string' && rawHeadline.trim().length > 0 ? rawHeadline.trim() : 'het gespreksonderwerp';
    const sanitizedHeadline = headlineLabel.replace(/"/g, '\'');
    const isNewsContext = !!(maybeNewsTopic?.summaryText && maybeNewsTopic.summaryText.trim().length > 0);
    const structuredSteps = [
        'Volg dit stappenplan nauwkeurig:',
        '1. Geef een warme, gastvrije begroeting in één zin.',
        isNewsContext
            ? '2. Vat het nieuwsbericht bondig samen en noem expliciet de bron.'
            : '2. Benoem kort het onderwerp en waarom het relevant is voor de leerling.',
        `3. Stel een open vraag over "${sanitizedHeadline}" en nodig de leerling uit om te reageren.`,
        'Gebruik maximaal vier zinnen in totaal en blijf in het Nederlands.',
    ].join('\n');
    const creativeContextBlock = creative
        ? ['Context creatieve oefening:', JSON.stringify({
            mode: creative.mode,
            config: creative.config,
            setup: creative.setup,
        }, null, 0)].join('\n')
        : '';

    const promptSections = [
        topicContextBlock,
        'Genereer een korte introductie voor deze oefening.',
        structuredSteps,
        'Gebruik de informatie hierboven letterlijk; verwijs expliciet naar het nieuws of onderwerp vóór je de open vraag stelt.',
        creativeContextBlock,
    ].filter(section => section && section.trim().length > 0);

    // 1. Generate the introductory text
    const textResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptSections.join('\n\n'),
        config: {
            systemInstruction: getSystemInstruction({
                level,
                activity,
                goals,
                strictness,
                topic,
                creative,
                isIntro: true,
            }),
        }
    });
    const introText = textResponse.text;

    // 2. Convert the text to speech
    const audioResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: introText }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
        },
    });
    const introAudio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!introAudio) {
        throw new Error("Could not generate introduction audio.");
    }

    return { text: introText, audio: introAudio };
}


/**
 * Establishes a connection to a Gemini Live session for real-time conversation.
 */
export const connectToLiveSession = async (
    level: CEFRLevel,
    activity: ActivityMode,
    goals: LearningGoal[],
    strictness: FeedbackStrictnessSettings,
    extras: SessionContextExtras = {},
    onMessage: (message: LiveServerMessage) => void,
    // FIX: The onError callback for live.connect receives an ErrorEvent, not a generic Event.
    onError: (error: ErrorEvent) => void,
    onClose: (event: CloseEvent) => void
): Promise<LiveSession> => {
    const { topic = null, creative = null } = extras;

    const baseSession = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => console.log('Live session opened.'),
            onmessage: onMessage,
            onerror: onError,
            onclose: onClose,
        },
        config: {
            // Native audio models only support AUDIO modality
            // Transcriptions come in serverContent.outputTranscription and serverContent.inputTranscription
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {}, // Request user speech transcription
            outputAudioTranscription: {}, // Request tutor speech transcription  
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: getSystemInstruction({
                level,
                activity,
                goals,
                strictness,
                topic,
                creative,
                isIntro: false,
            }),
        },
    });

    // Wrap the session to add sendSilentTrigger method
    const wrappedSession: LiveSession = {
        sendRealtimeInput: (input) => baseSession.sendRealtimeInput(input),
        close: () => baseSession.close(),
        sendSilentTrigger: async () => {
            // Wait a moment for the session to be fully ready
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Send a text instruction with SYSTEEMINSTRUCTIE prefix (like "Vraag door" does)
            // This explicitly triggers the tutor to start speaking
            baseSession.sendRealtimeInput({ 
                text: 'SYSTEEMINSTRUCTIE: Begin nu onmiddellijk met het gesprek. Stel direct de openingsvraag en spreek hardop. Wacht niet op user input - begin meteen met praten.' 
            });
            
            // Wait a bit more before sending audio trigger
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Also send a longer silent audio trigger (500ms) to ensure the API processes it
            const durationMs = 500;
            const sampleRate = 16000;
            const numSamples = Math.floor((durationMs / 1000) * sampleRate);
            const buffer = new ArrayBuffer(numSamples * 2); // 2 bytes per sample (PCM16)
            const view = new Int16Array(buffer);
            view.fill(0); // Fill with zeros (silence)

            // Convert to base64
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64Audio = btoa(binary);

            // Send as realtime input using Blob format
            const audioBlob: Blob = {
                mimeType: 'audio/pcm;rate=16000',
                data: base64Audio,
            };

            baseSession.sendRealtimeInput({ media: audioBlob });
            console.log('Silent audio trigger sent (500ms silence + SYSTEEMINSTRUCTIE text)');
        },
    };

    return wrappedSession;
};

export const generateClosingReflection = async (
    transcripts: Transcript[],
    level: CEFRLevel,
    activity: ActivityMode,
    goals: LearningGoal[],
    strictness: FeedbackStrictnessSettings,
    extras: SessionContextExtras = {},
): Promise<string> => {
    const { topic = null, creative = null } = extras;
    const recentTurns = transcripts.slice(-10).map(turn => {
        const speakerLabel = turn.speaker === 'user' ? 'Student' : turn.speaker === 'model' ? 'Tutor' : 'Systeem';
        return `${speakerLabel}: ${turn.text}`;
    }).join('\n');

    const goalLabels = goals.length
        ? goals.map(goalKey => LEARNING_GOAL_METADATA[goalKey]?.label ?? goalKey).join(', ')
        : 'algemene vooruitgang';
    const reflectionPrompt = `Je hebt zojuist een Nederlandstalige sessie afgerond met een Spaanstalige leerling. Schrijf een korte afsluiting van maximaal 4 zinnen in het Nederlands.
- Benoem één compliment over de deelname van de leerling.
- Verbind de afsluiting aan de actieve leerdoelen (${goalLabels}).
- Geef één concrete suggestie voor het volgende gesprek.
- Houd de toon warm, motiverend en professioneel.`;
    const creativeContextBlock = creative
        ? `\nCreatieve activiteit (mode: ${creative.mode}):\n${JSON.stringify({
            mode: creative.mode,
            config: creative.config,
            setup: creative.setup,
        })}`
        : '';

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Laatste beurten:\n${recentTurns}\n\n${reflectionPrompt}${creativeContextBlock}`,
        config: {
            systemInstruction: getSystemInstruction({
                level,
                activity,
                goals,
                strictness,
                topic,
                creative,
            }),
        },
    });

    const closingText = response.text?.trim();
    if (!closingText) {
        throw new Error('Kon geen afsluitende reflectie genereren.');
    }
    return closingText;
};
