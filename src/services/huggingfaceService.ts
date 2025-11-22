import type { ExtraExercise } from '@/data/extraExercises';
import type { CEFRLevel } from '@/types';

const HF_API_TOKEN = import.meta.env.VITE_HF_API_KEY;

// Lijst van populaire instruct modellen om te proberen (in volgorde van voorkeur)
const CANDIDATE_MODELS = [
    'meta-llama/Llama-3.1-8B-Instruct',
    'meta-llama/Llama-3.2-3B-Instruct',
    'microsoft/Phi-3-mini-4k-instruct',
    'microsoft/Phi-3-medium-4k-instruct',
    'mistralai/Mistral-7B-Instruct-v0.1',
    'mistralai/Mistral-7B-Instruct-v0.2',
    'HuggingFaceH4/zephyr-7b-beta',
    'HuggingFaceH4/zephyr-7b-alpha',
] as const;

// Minimale fallback lijst als automatische detectie faalt
const FALLBACK_MODELS = [
    'meta-llama/Llama-3.2-3B-Instruct',
    'microsoft/Phi-3-mini-4k-instruct',
    'mistralai/Mistral-7B-Instruct-v0.1',
] as const;

// Cache voor werkende modellen (per sessie)
let cachedWorkingModel: string | null = null;
let modelCacheTimestamp: number = 0;
const MODEL_CACHE_TTL = 60 * 60 * 1000; // 1 uur

// Context topics per CEFR niveau voor maximale variatie
const CONTEXT_TOPICS_BY_LEVEL: Record<CEFRLevel, string[]> = {
    A1: [
        'dagelijkse routine',
        'familie',
        'boodschappen',
        'vrije tijd',
        'het weer',
        'kleding',
        'eten en drinken',
        'dieren',
        'kleuren',
        'getallen',
    ],
    A2: [
        'werk en studie',
        'reizen',
        'hobby\'s',
        'gezondheid',
        'winkelen',
        'feestdagen',
        'vrienden',
        'sport',
        'muziek',
        'films',
    ],
    B1: [
        'nieuws en actualiteit',
        'cultuur',
        'milieu',
        'technologie',
        'onderwijs',
        'sport',
        'kunst',
        'reizen en toerisme',
        'werk en carrière',
        'gezondheid en welzijn',
    ],
    B2: [
        'politiek',
        'economie',
        'wetenschap',
        'literatuur',
        'filosofie',
        'maatschappij',
        'geschiedenis',
        'internationale betrekkingen',
        'media en communicatie',
        'innovatie',
    ],
    C1: [
        'abstracte concepten',
        'ethiek',
        'complexe maatschappelijke kwesties',
        'academische onderwerpen',
        'professionele contexten',
        'interculturele communicatie',
        'taal en linguïstiek',
        'kunst en esthetiek',
    ],
    C2: [
        'gespecialiseerde vakgebieden',
        'nuance en subtiliteit',
        'complexe argumentatie',
        'interculturele communicatie',
        'academisch onderzoek',
        'literaire analyse',
        'filosofische discussies',
    ],
};

// Genereer een willekeurig context topic voor variatie
const getRandomContextTopic = (level: CEFRLevel): string => {
    const topics = CONTEXT_TOPICS_BY_LEVEL[level];
    return topics[Math.floor(Math.random() * topics.length)];
};

interface GenerateExerciseOptions {
    exercise: ExtraExercise;
    learnerLevel: CEFRLevel;
    learnerGoal?: string;
    contextTopic?: string;
}

const HF_API_BASE = 'https://router.huggingface.co/v1/chat/completions';
const HF_PROXY_URL = '/api/hf-proxy';

// Helper om te bepalen of we via proxy moeten werken
const getModelUrl = (modelId: string): string => {
    // In development, gebruik altijd proxy om CORS te omzeilen
    // In production, gebruik proxy als VITE_HF_PROXY_URL is ingesteld, anders direct
    const useProxy = import.meta.env.DEV || import.meta.env.VITE_HF_PROXY_URL;
    
    if (useProxy) {
        return `${HF_PROXY_URL}?model=${encodeURIComponent(modelId)}`;
    }
    return HF_API_BASE;
};

const isModelCoolingDown = (status: number) => status === 503 || status === 524;

const decodeTextFromPayload = (payload: unknown): string | null => {
    if (!payload) {
        return null;
    }

    // Probeer eerst OpenAI-compatibele format (nieuwe API)
    if (typeof payload === 'object' && payload !== null) {
        // OpenAI format: { choices: [{ message: { content: "..." } }] }
        if ('choices' in payload && Array.isArray((payload as { choices?: unknown[] }).choices)) {
            const choices = (payload as { choices: Array<{ message?: { content?: string } }> }).choices;
            if (choices.length > 0 && choices[0].message?.content) {
                return choices[0].message.content;
            }
        }
        
        // Oude format: { generated_text: "..." } of [{ generated_text: "..." }]
        if ('generated_text' in payload) {
            const generated = (payload as { generated_text?: string }).generated_text;
            if (generated) {
                return generated;
            }
        }
    }

    if (typeof payload === 'string') {
        return payload;
    }

    if (Array.isArray(payload)) {
        for (const candidate of payload) {
            if (candidate && typeof candidate === 'object' && 'generated_text' in candidate) {
                const generated = (candidate as { generated_text?: string }).generated_text;
                if (generated) {
                    return generated;
                }
            }
        }
    }

    return null;
};

// Helper functie voor oefening-specifieke instructies
const getExerciseTypeSpecificInstructions = (exerciseId: string): string => {
    const instructions: Record<string, string> = {
        'diminutives': 'BELANGRIJK: Gebruik GEEN invulvelden en GEEN slash-gescheiden opties in de vraagtekst! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende verkleinwoorden. Format: "Kies het juiste verkleinwoord:" gevolgd door "- [ ] Optie A: autootje", "- [ ] Optie B: autotje", "- [ ] Optie C: autje". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie. Geef minimaal 3 opties per vraag.',
        'phrasal-verbs': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen scheidbare en onscheidbare werkwoorden. Format: "Kies het juiste werkwoord:" gevolgd door "- [ ] Optie A: opstaan", "- [ ] Optie B: op staan", "- [ ] Optie C: opstaan". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'plural-forms': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende meervoudsvormen. Format: "Kies het juiste meervoud:" gevolgd door "- [ ] Optie A: huizen", "- [ ] Optie B: huizes", "- [ ] Optie C: huis". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'prepositions': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende voorzetsels. Format: "Kies het juiste voorzetsel:" gevolgd door "- [ ] Optie A: op", "- [ ] Optie B: in", "- [ ] Optie C: bij". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'negation': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen "niet" en "geen". Format: "Kies het juiste woord:" gevolgd door "- [ ] Optie A: niet", "- [ ] Optie B: geen", "- [ ] Optie C: beide mogelijk". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'modal-verbs': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende modale werkwoorden. Format: "Kies het juiste werkwoord:" gevolgd door "- [ ] Optie A: kunnen", "- [ ] Optie B: moeten", "- [ ] Optie C: willen". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'cloze-test': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende woorden om een gat in een tekst te vullen. Format: "Kies het juiste woord:" gevolgd door "- [ ] Optie A: [woord]", "- [ ] Optie B: [woord]", "- [ ] Optie C: [woord]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'de-het-swipe': 'Voor deze oefening: Geef 10 woorden die de leerling moet sorteren naar "de" of "het". Format: "Sorteer deze woorden naar de/het: huis, boek, tafel, ..." Varieer in moeilijkheidsgraad en gebruik verschillende categorieën (dieren, voorwerpen, abstracte concepten).',
        'de-het-memory': 'Voor deze oefening: Maak 10 paren van woorden en hun lidwoorden. Format: "Match elk woord met zijn lidwoord: huis-het, boek-het, ..." Zorg voor een goede mix van "de" en "het" woorden.',
        'de-het-contextual': 'BELANGRIJK: Voor deze oefening gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen "de" en "het" in context. Format: "Kies het juiste lidwoord:" gevolgd door "- [ ] Optie A: de", "- [ ] Optie B: het", "- [ ] Optie C: beide zijn mogelijk". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'sentence-jigsaw': 'BELANGRIJK: Voor deze oefening MOET je het exacte format gebruiken: "Zet in volgorde: woord1, woord2, woord3, ..." waarbij de woorden/zinsdelen gescheiden zijn door komma\'s. Geef 10 zinnen waarbij elke zin begint met "Zet in volgorde:" gevolgd door de losse woorden. Bijvoorbeeld: "Zet in volgorde: ik, gisteren, ben, naar, de, winkel, gegaan". Zorg dat de woorden in de juiste volgorde staan wanneer ze worden samengevoegd. Varieer in lengte (5-10 woorden per zin) en gebruik verschillende contexten (werk, thuis, reizen, etc.).',
        'inversion-practice': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen zinnen met en zonder inversie. Format: "Kies de juiste zin:" met opties zoals "A) Gisteren ik heb gewerkt" vs "B) Gisteren heb ik gewerkt". Focus op inversie na tijds-/plaatsbepalingen.',
        'subordinate-clause-sov': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen correcte en incorrecte bijzin constructies. Format: "Kies de juiste bijzin:" met opties die het verschil tussen hoofdzin en bijzin tonen. Focus op bijzinnen waarbij het werkwoord naar het einde gaat.',
        'perfectum-practice': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen "hebben" en "zijn". Format: "Kies het juiste hulpwerkwoord: Ik [heb/ben] gewerkt" met opties A) heb, B) ben, C) beide mogelijk. Leg uit wanneer welke gebruikt wordt.',
        'imperfectum-practice': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen imperfectum en perfectum. Format: "Kies de juiste vorm:" met contextuele hints. Geef voorbeelden die het verschil tussen verhaal (imperfectum) en resultaat (perfectum) tonen.',
        'adjective-declension': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen vormen met en zonder "-e". Format: "Kies de juiste vorm: een [mooi/mooie] huis" met opties A) mooi, B) mooie, C) beide mogelijk. Focus op het verschil tussen "een mooi huis" en "het mooie huis".',
        'er-word-practice': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen die de vier functies van "er" testen: locatie ("er is"), kwantiteit ("er zijn twee"), passief ("er wordt gezegd"), en existentieel gebruik. Format: "Kies de juiste zin met \'er\':" met verschillende opties.',
        'compound-words': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende samenstellingen. Format: "Wat is de juiste samenstelling van \'tafel\' en \'poot\'?" met opties A) tafelpoot, B) tafelpoot, C) tafel-poot. Let op tussen-n/-s regels.',
        'dictation': 'Voor deze oefening: Geef korte zinnen (max 10 woorden) die de leerling moet typen. Format: "Luister en typ: [volledige zin]" Focus op moeilijke spelling (ei/ij, au/ou) en grammatica. Varieer in lengte en moeilijkheidsgraad.',
        'image-description': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende beschrijvingen van afbeeldingen. Format: "Kies de juiste beschrijving:" met opties die verschillen in voorzetsels, lidwoorden en woordvolgorde. Beschrijf scenario\'s duidelijk.',
        'spot-difference': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen beschrijvingen van verschillen tussen twee afbeeldingen. Format: "Wat is het verschil?" met opties die verschillende aspecten beschrijven.',
        'modal-particles': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling het juiste modale partikel moet kiezen. Format: "Kies het juiste partikel: Kom je [toch/wel/eens]?" met opties A) toch, B) wel, C) eens, D) geen partikel. Focus op gevoel (twijfel, geruststelling, irritatie).',
        'speech-acts': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende spreekhandelingen. Format: "Wat zeg je in deze situatie?" met opties voor klacht indienen, verzoek doen, waarschuwen, adviseren, etc. Geef duidelijke scenario\'s.',
        'social-scripts': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen over sociale situaties. Format: "Wat zeg je als iemand niest?" met opties die verschillende niveaus van beleefdheid tonen. Focus op verjaardag, winkel, verlies/overlijden, etc.',
        'spelling-rules': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen moeilijke spellingparen. Format: "Kies de juiste spelling:" met opties voor ei/ij, au/ou, g/ch, v/f, z/s. Geef contextuele hints.',
        'numbers-time-date': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen over grote getallen, kloktijden en datums. Format: "Hoe zeg je 2.345.678?" met opties. Focus op kloktijden ("kwart voor", "vijf over half") en datums ("11 november" vs "de 11e").',
        'punctuation': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen waar leestekens moeten staan. Format: "Waar komt de komma?" gevolgd door "- [ ] Optie A: [locatie]", "- [ ] Optie B: [locatie]", "- [ ] Optie C: [locatie]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie. Focus op komma\'s, trema\'s (zee-eend), koppeltekens (auto-ongeluk), en aanhalingstekens.',
        'idioms-context': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende idiomen. Format: "Kies het juiste idioom:" gevolgd door "- [ ] Optie A: [idioom]", "- [ ] Optie B: [idioom]", "- [ ] Optie C: [idioom]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'dialogue-completion': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende dialoogreplieken. Format: "Kies de juiste repliek:" gevolgd door "- [ ] Optie A: [repliek]", "- [ ] Optie B: [repliek]", "- [ ] Optie C: [repliek]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'error-correction': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen correcte en incorrecte zinnen. Format: "Kies de correcte zin:" gevolgd door "- [ ] Optie A: [zin]", "- [ ] Optie B: [zin]", "- [ ] Optie C: [zin]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'register-switching': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen formele en informele uitdrukkingen. Format: "Kies de juiste uitdrukking:" gevolgd door "- [ ] Optie A: [formele]", "- [ ] Optie B: [informele]", "- [ ] Optie C: [beide mogelijk]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'conditionals': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende voorwaardelijke zinnen. Format: "Kies de juiste zin:" gevolgd door "- [ ] Optie A: [zin]", "- [ ] Optie B: [zin]", "- [ ] Optie C: [zin]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'passive-voice': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen actieve en passieve zinnen. Format: "Kies de juiste vorm:" gevolgd door "- [ ] Optie A: [actief]", "- [ ] Optie B: [passief]", "- [ ] Optie C: [beide correct]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'relative-clauses': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende betrekkelijke voornaamwoorden. Format: "Kies het juiste woord:" gevolgd door "- [ ] Optie A: die", "- [ ] Optie B: dat", "- [ ] Optie C: waar". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'listening-comprehension': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen op basis van een luistertekst. Format: "Kies het juiste antwoord:" gevolgd door "- [ ] Optie A: [antwoord]", "- [ ] Optie B: [antwoord]", "- [ ] Optie C: [antwoord]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'synonyms-antonyms': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen synoniemen of antoniemen. Format: "Kies het juiste woord:" gevolgd door "- [ ] Optie A: [woord]", "- [ ] Optie B: [woord]", "- [ ] Optie C: [woord]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'word-formation': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende woordvormen. Format: "Kies de juiste vorm:" gevolgd door "- [ ] Optie A: [vorm]", "- [ ] Optie B: [vorm]", "- [ ] Optie C: [vorm]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'conversation-starters': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende gespreksopeners. Format: "Kies de juiste opener:" gevolgd door "- [ ] Optie A: [opener]", "- [ ] Optie B: [opener]", "- [ ] Optie C: [opener]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'collocations': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende woordcombinaties. Format: "Kies de juiste combinatie:" gevolgd door "- [ ] Optie A: [combinatie]", "- [ ] Optie B: [combinatie]", "- [ ] Optie C: [combinatie]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'pronunciation-feedback': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende uitspraakvarianten. Format: "Kies de juiste uitspraak:" gevolgd door "- [ ] Optie A: [variant]", "- [ ] Optie B: [variant]", "- [ ] Optie C: [variant]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'voice-comparison': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende intonatiepatronen. Format: "Kies het juiste patroon:" gevolgd door "- [ ] Optie A: [patroon]", "- [ ] Optie B: [patroon]", "- [ ] Optie C: [patroon]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'debate-argumentation': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende argumenten. Format: "Kies het beste argument:" gevolgd door "- [ ] Optie A: [argument]", "- [ ] Optie B: [argument]", "- [ ] Optie C: [argument]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'accent-reduction': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende uitspraakvarianten. Format: "Kies de juiste uitspraak:" gevolgd door "- [ ] Optie A: [variant]", "- [ ] Optie B: [variant]", "- [ ] Optie C: [variant]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'cultural-context': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen verschillende culturele reacties. Format: "Kies de juiste reactie:" gevolgd door "- [ ] Optie A: [reactie]", "- [ ] Optie B: [reactie]", "- [ ] Optie C: [reactie]". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
        'minimal-pairs': 'BELANGRIJK: Gebruik GEEN invulvelden! Maak 10 multiple choice vragen waarbij de leerling moet kiezen tussen minimale paren. Format: "Kies het juiste woord:" gevolgd door "- [ ] Optie A: vis", "- [ ] Optie B: vies", "- [ ] Optie C: beide". Gebruik ALTIJD het markdown format met "- [ ] Optie X:" voor elke optie.',
    };
    
    return instructions[exerciseId] || '';
};

/**
 * Haal eerdere vragen op voor een oefening om herhaling te voorkomen
 */
function getPreviousQuestions(exerciseId: string): string[] {
    if (typeof window === 'undefined') return [];
    
    try {
        const key = `extraPracticeResults`;
        const stored = localStorage.getItem(key);
        if (!stored) return [];
        
        const results: Record<string, { exerciseData?: { questions?: Array<{ questionText?: string }> } }> = JSON.parse(stored);
        const exerciseResult = results[exerciseId];
        
        if (!exerciseResult?.exerciseData?.questions) return [];
        
        // Extract vraagteksten uit eerdere vragen
        return exerciseResult.exerciseData.questions
            .map(q => q.questionText)
            .filter((text): text is string => text !== undefined && text.trim().length > 0)
            .slice(0, 20); // Max 20 eerdere vragen om prompt niet te lang te maken
    } catch {
        return [];
    }
}

const buildPrompt = ({ exercise, learnerLevel, learnerGoal, contextTopic }: GenerateExerciseOptions): string => {
    // Gebruik een random context topic als er geen is opgegeven, voor variatie
    const finalContextTopic = contextTopic || getRandomContextTopic(learnerLevel);
    
    // Voeg een unieke variation-ID toe voor maximale variatie
    const variationSeed = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    
    // Haal eerdere vragen op om herhaling te voorkomen
    const previousQuestions = getPreviousQuestions(exercise.id);
    
    // Genereer meerdere random context topics voor variatie
    const allTopics = CONTEXT_TOPICS_BY_LEVEL[learnerLevel] || CONTEXT_TOPICS_BY_LEVEL.A2;
    const randomTopics = [...allTopics]
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)
        .join(', ');
    
    const metaLines = [
        `Doelniveau: CEFR ${learnerLevel}.`,
        learnerGoal ? `Leerdoel: ${learnerGoal}.` : null,
        `Thema of onderwerp: ${finalContextTopic}.`,
        `Variatie-ID: ${variationSeed} (maak deze oefening uniek en anders dan eerdere versies).`,
        `Beschikbare contexten voor variatie: ${randomTopics}.`,
    ]
        .filter(Boolean)
        .join('\n');

    return [
        'Je bent een ervaren Nederlandse taalcoach die interactieve, leerzame oefeningen ontwerpt.',
        '',
        'BELANGRIJKE RICHTLIJNEN VOOR DE OEFENING:',
        '',
        '1. AANTAL VRAGEN:',
        '   - Je MOET precies 10 vragen maken, niet meer, niet minder',
        '   - Verdeel de vragen over verschillende vraagtypes (multiple choice, checkboxes, en andere interactieve types)',
        '',
        '2. INTERACTIVITEIT:',
        '   - BELANGRIJK: Gebruik GEEN invulvelden ([_____]) - deze zijn NIET toegestaan!',
        '   - BELANGRIJK: Gebruik GEEN slash-gescheiden opties in de vraagtekst (bijv. "auto/auto/auto\'s" of "mooi/mooie") - deze zijn NIET toegestaan!',
        '   - Vervang ALLE invuloefeningen door multiple choice vragen',
        '   - Elke vraag MOET minimaal 3 opties hebben',
        '   - Gebruik markdown formatting:',
        '     * - [ ] Optie A: [volledige tekst]',
        '     * - [ ] Optie B: [volledige tekst]',
        '     * - [ ] Optie C: [volledige tekst]',
        '     * Dit is het ENIGE toegestane format voor multiple choice vragen!',
        '     * Gebruik NOOIT slash-gescheiden opties zoals "auto/auto/auto\'s" in de vraagtekst!',
        '     * [ ] voor checkboxes (meerdere antwoorden mogelijk)',
        '     * Voor swipe-sort: "Sorteer deze woorden naar de/het: huis, boek, tafel, ..."',
        '     * Voor memory: "Match elk woord met zijn lidwoord: huis-het, boek-het, ..."',
        '     * Voor jigsaw: "Zet deze woorden in de juiste volgorde: ik, gisteren, ben, gegaan"',
        '     * Voor dictee: "Luister en typ: [tekst]"',
        '     * Voor afbeeldingen: Gebruik een beschrijving of URL',
        '     * Voor transformatie: "Herschrijf deze zin naar perfectum: ..."',
        '     * Voor samenstellingen: "tafel + poot = ?"',
        '   - Maak opdrachten waarbij de leerling actief moet nadenken en kiezen',
        '   - Geef GEEN voorbeeldantwoorden waar de leerling zelf moet invullen',
        '',
        '3. STRUCTUUR:',
        '   - Begin met een korte, duidelijke inleiding (max 3 zinnen)',
        '   - Gebruik duidelijke kopjes met ** (bijv. **Vraag 1:**, **Vraag 2:**, etc.)',
        '   - Nummer alle 10 vragen duidelijk (1, 2, 3, ..., 10)',
        '   - Gebruik bullets (-) voor lijsten en opties',
        '',
        '4. LEERZAAMHEID:',
        '   - Geef eerst korte uitleg VOOR de oefening, niet tijdens',
        '   - Laat de leerling zelf oefenen met lege velden',
        '   - Voeg aan het einde een "**Controleer je antwoorden**" sectie toe met correcte antwoorden',
        '   - Geef tips en uitleg bij de controle, niet bij de opdracht zelf',
        '   - Voeg een "**Uitleg**" sectie toe met algemene uitleg over het onderwerp',
        '',
        '5. GEBRUIKSVRIENDELIJKHEID:',
        '   - Gebruik duidelijke instructies: "Vul in:", "Kies:", "Selecteer:"',
        '   - Maak opdrachten stap-voor-stap, niet alles tegelijk',
        '   - Gebruik concrete voorbeelden in de uitleg, maar niet in de invulvelden',
        '',
        '6. VOORBEELD STRUCTUUR:',
        '   **Inleiding**',
        '   Korte uitleg over het onderwerp...',
        '',
        '   **Vraag 1:**',
        '   Kies het juiste antwoord:',
        '   - [ ] Optie A: naar',
        '   - [ ] Optie B: op',
        '   - [ ] Optie C: in',
        '',
        '   **Vraag 2:**',
        '   Kies het juiste antwoord:',
        '   - [ ] Optie A: Goed geslapen hebben',
        '   - [ ] Optie B: Te laat zijn',
        '   - [ ] Optie C: Wakker worden',
        '',
        '   **Vraag 3:**',
        '   Selecteer alle juiste antwoorden:',
        '   - [ ] Optie 1',
        '   - [ ] Optie 2',
        '   - [ ] Optie 3',
        '',
        '   ... (tot Vraag 10)',
        '',
        '   **Controleer je antwoorden**',
        '   BELANGRIJK: Geef voor ALLE 10 vragen het correcte antwoord en een uitleg!',
        '',
        '   Format voor antwoorden:',
        '   1. Voor multiple choice: "1. Optie A: [volledige tekst van optie A]" gevolgd door "Uitleg: [uitleg]"',
        '   2. Voor checkboxes: "1. Optie A, Optie C" gevolgd door "Uitleg: [uitleg]"',
        '   3. Voor andere types: "1. [correct antwoord]" gevolgd door "Uitleg: [uitleg]"',
        '',
        '   Voorbeeld:',
        '   1. Optie A: Ik ga naar de winkel.',
        '   Uitleg: Het voorzetsel "naar" wordt gebruikt voor richting.',
        '',
        '   2. Optie B: Goed geslapen hebben',
        '   Uitleg: Deze uitdrukking betekent dat je goed hebt geslapen.',
        '',
        '   3. Optie A, Optie C',
        '   Uitleg: Beide opties zijn correct omdat...',
        '',
        '   ... (voor ALLE 10 vragen - controleer dat je precies 10 antwoorden geeft!)',
        '',
        '   **Uitleg**',
        '   Algemene uitleg over het onderwerp van deze oefening. Dit helpt de leerling om het concept beter te begrijpen.',
        '',
        'VERMIJD:',
        '- Invulvelden ([_____]) - gebruik ALTIJD multiple choice',
        '- Ingevulde antwoorden in oefenvelden',
        '- Te lange uitleg tijdens de opdracht',
        '- Verwarrende of onduidelijke instructies',
        '- Alles in één grote paragraaf zonder structuur',
        '- Minder of meer dan 10 vragen',
        '- Vragen zonder opties (geen invulvelden!)',
        '',
        metaLines,
        `Oefening: ${exercise.title} (${exercise.focus}).`,
        '',
        'Specifieke instructies voor deze oefening:',
        exercise.prompt,
        '',
        getExerciseTypeSpecificInstructions(exercise.id),
        '',
        'BELANGRIJK: Maak precies 10 vragen en maak deze oefening uniek met verschillende voorbeelden, scenario\'s en contexten dan bij eerdere generaties.',
        '',
        'VARIATIE EN UNIEKHEID (ZEER BELANGRIJK!):',
        '- Gebruik ALTIJD verschillende voorbeelden, scenario\'s en contexten voor elke vraag',
        '- Varieer in vraagtypes: gebruik niet alleen multiple choice, maar ook checkboxes waar mogelijk',
        '- Varieer in moeilijkheidsgraad binnen dezelfde oefening',
        '- Gebruik verschillende onderwerpen/thema\'s voor elke vraag',
        '- Varieer in formulering: gebruik niet steeds "Kies het juiste antwoord"',
        '  * Alternatieven: "Wat is het juiste antwoord?", "Selecteer de beste optie", "Welke optie past hier?", "Kies de juiste vorm", etc.',
        '- Varieer in zinsconstructie en woordkeuze',
        '- Gebruik verschillende contexten: werk, thuis, school, vrije tijd, reizen, sport, eten, winkelen, etc.',
        '- Varieer in lengte van vragen: sommige kort en direct, andere met meer context',
        '- Zorg dat elke vraag een unieke situatie of scenario beschrijft',
        '',
        'VOORBEELDEN VAN VARIATIE:',
        '- Vraag 1: Werkcontext ("In het kantoor...", "Tijdens een vergadering...")',
        '- Vraag 2: Thuiscontext ("Thuis...", "In de keuken...")',
        '- Vraag 3: Reizencontext ("Op vakantie...", "In de trein...")',
        '- Vraag 4: Schoolcontext ("Op school...", "Tijdens de les...")',
        '- Vraag 5: Sociale context ("Met vrienden...", "Op een feestje...")',
        '- Vraag 6: Winkelen ("In de winkel...", "Bij de kassa...")',
        '- Vraag 7: Sport ("Tijdens het sporten...", "In de sportschool...")',
        '- Vraag 8: Eten ("In het restaurant...", "Bij het koken...")',
        '- Vraag 9: Vervoer ("In de auto...", "Op de fiets...")',
        '- Vraag 10: Vrije tijd ("In de bioscoop...", "Bij het lezen...")',
        '',
        'VERMIJD:',
        '- Hetzelfde voorbeeld meerdere keren gebruiken',
        '- Steeds dezelfde formulering ("Kies het juiste antwoord" bij elke vraag)',
        '- Alleen simpele, korte vragen zonder context',
        '- Alleen één type context (bijv. alleen werk)',
        '- Herhaling van woorden of zinsconstructies',
        '',
        previousQuestions.length > 0 ? [
            '',
            'BELANGRIJK: De volgende vragen zijn al eerder gegenereerd voor deze oefening. Gebruik ZEKER NIET dezelfde vragen:',
            ...previousQuestions.slice(0, 10).map((q, i) => `${i + 1}. ${q.substring(0, 100)}${q.length > 100 ? '...' : ''}`),
            '',
            'Maak VOLLEDIG NIEUWE vragen met andere voorbeelden, andere contexten en andere formuleringen!',
        ].join('\n') : '',
        '',
        'CONTROLEER VOOR JE KLAAR BENT:',
        '1. Heb je precies 10 vragen gemaakt? (Tel ze na: Vraag 1, Vraag 2, ..., Vraag 10)',
        '2. Heeft elke vraag minimaal 3 opties? (Voor multiple choice en checkbox vragen)',
        '3. Zijn ALLE 10 antwoorden opgenomen in de "Controleer je antwoorden" sectie?',
        '4. Heeft elk antwoord een duidelijke uitleg?',
        '5. Is er een "**Uitleg**" sectie toegevoegd met algemene uitleg?',
        '',
        'Als je niet precies 10 vragen hebt gemaakt, maak dan meer vragen tot je 10 hebt!',
    ]
        .filter(Boolean)
        .join('\n');
};

// Maak OpenAI-compatibele request body
const createOpenAIRequest = (modelId: string, prompt: string): { model: string; messages: Array<{ role: string; content: string }>; max_tokens: number; temperature: number; top_p: number } => {
    // Verhoogde temperature voor meer variatie (tussen 0.8 en 1.0)
    const temperature = 0.8 + Math.random() * 0.2;
    
    return {
        model: modelId,
        messages: [
            {
                role: 'user',
                content: prompt,
            },
        ],
        max_tokens: 650,
        temperature: temperature,
        top_p: 0.95, // Verhoogd van 0.9 naar 0.95 voor meer variatie
    };
};

const callModel = async (modelId: string, prompt: string, apiToken: string, retryCount = 0): Promise<string> => {
    const url = getModelUrl(modelId);
    const useProxy = url.startsWith(HF_PROXY_URL);
    const requestBody = createOpenAIRequest(modelId, prompt);
    
    // Als we via proxy gaan, stuur Authorization header mee (proxy gebruikt deze)
    const requestInit: RequestInit = useProxy
        ? {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${apiToken}`,
              },
              body: JSON.stringify({
                  inputs: prompt,
                  parameters: {
                      max_new_tokens: requestBody.max_tokens,
                      temperature: requestBody.temperature,
                      top_p: requestBody.top_p,
                  },
              }),
          }
        : {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${apiToken}`,
              },
              body: JSON.stringify(requestBody),
          };
    
    const response = await fetch(url, requestInit);

    if (!response.ok) {
        if (isModelCoolingDown(response.status)) {
            // Retry logica: wacht 2-3 seconden en probeer opnieuw (max 2 retries)
            if (retryCount < 2) {
                const waitTime = 2000 + Math.random() * 1000; // 2-3 seconden
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return callModel(modelId, prompt, apiToken, retryCount + 1);
            }
            throw new Error('model-loading');
        }

        if (response.status === 401 || response.status === 403) {
            throw new Error('unauthorized');
        }

        if (response.status === 429) {
            throw new Error('rate-limited');
        }

        // Probeer error details te krijgen
        let errorMessage = `Hugging Face gaf status ${response.status}.`;
        try {
            const errorText = await response.text();
            if (errorText) {
                try {
                    const errorPayload = JSON.parse(errorText);
                    if (errorPayload && typeof errorPayload === 'object' && 'error' in errorPayload) {
                        errorMessage = String(errorPayload.error);
                    } else {
                        errorMessage = errorText.substring(0, 200); // Limiteer lengte
                    }
                } catch {
                    errorMessage = errorText.substring(0, 200);
                }
            }
        } catch {
            // Gebruik standaard message
        }
        throw new Error(errorMessage);
    }

    const payload = await response.json().catch(() => null);
    const text = decodeTextFromPayload(payload);
    if (!text || text.trim().length === 0) {
        throw new Error('Leeg antwoord van Hugging Face ontvangen.');
    }
    return text.trim();
};

// Test een model met een kleine test prompt
const testModel = async (modelId: string, apiToken: string): Promise<boolean> => {
    try {
        await callModel(modelId, 'test', apiToken);
        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Als unauthorized, betekent dit dat het token ongeldig is
        if (message === 'unauthorized') {
            throw new Error('Hugging Face token ongeldig. Controleer VITE_HF_API_KEY.');
        }
        return false;
    }
};

// Ontdek beschikbare modellen door ze te testen
const discoverAvailableModel = async (apiToken: string): Promise<string | null> => {
    // Check cache eerst
    const now = Date.now();
    if (cachedWorkingModel && (now - modelCacheTimestamp) < MODEL_CACHE_TTL) {
        return cachedWorkingModel;
    }

    // Test modellen sequentieel tot er een werkt
    for (const model of CANDIDATE_MODELS) {
        const works = await testModel(model, apiToken);
        if (works) {
            cachedWorkingModel = model;
            modelCacheTimestamp = now;
            return model;
        }
    }

    return null;
};

export const generateExtraExercise = async (options: GenerateExerciseOptions): Promise<string> => {
    if (!HF_API_TOKEN) {
        throw new Error(
            'Hugging Face API token vereist. Voeg VITE_HF_API_KEY toe aan je .env.local. ' +
            'Zie README.md voor instructies over gratis Hugging Face tokens.'
        );
    }

    const prompt = buildPrompt(options);
    const errors: Record<string, string> = {};

    // Probeer eerst automatische modeldetectie
    const workingModel = await discoverAvailableModel(HF_API_TOKEN);

    // Als automatische detectie faalt, probeer fallback modellen
    if (!workingModel) {
        for (const model of FALLBACK_MODELS) {
            try {
                return await callModel(model, prompt, HF_API_TOKEN);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                errors[model] = message;
                if (message === 'unauthorized') {
                    throw new Error('Hugging Face token ongeldig. Controleer VITE_HF_API_KEY.');
                }
                continue;
            }
        }
    }

    // Als we een werkend model hebben, gebruik het
    if (workingModel) {
        try {
            return await callModel(workingModel, prompt, HF_API_TOKEN);
        } catch (error) {
            // Als het gecachte model faalt, clear cache en probeer opnieuw
            cachedWorkingModel = null;
            modelCacheTimestamp = 0;
            
            const message = error instanceof Error ? error.message : String(error);
            errors[workingModel] = message;
            
            if (message === 'unauthorized') {
                throw new Error('Hugging Face token ongeldig. Controleer VITE_HF_API_KEY.');
            }
        }
    }

    // Als alles faalt, geef een duidelijke foutmelding
    const diagnostics = Object.entries(errors)
        .map(([model, reason]) => `${model}: ${reason}`)
        .join('; ');
    
    const hasCorsError = diagnostics.toLowerCase().includes('cors') || 
                        diagnostics.toLowerCase().includes('failed to fetch') ||
                        diagnostics.toLowerCase().includes('network');
    
    const corsHint = hasCorsError 
        ? ' CORS probleem gedetecteerd - controleer of de proxy correct werkt in development of productie.'
        : '';
    
    throw new Error(`Geen beschikbaar Hugging Face model gevonden. Laatste foutmeldingen: ${diagnostics}.${corsHint}`);
};