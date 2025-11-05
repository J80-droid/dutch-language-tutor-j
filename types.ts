export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CEFRLevel = typeof CEFR_LEVELS[number];

export type ActivityMode = 
  // Basis Oefeningen
  | 'conversation'
  | 'vocabulary'
  | 'grammar'
  | 'culture'
  // Interactieve Scenario's
  | 'job-interview'
  | 'making-complaint'
  | 'expressing-opinion'
  | 'giving-instructions'
  // Gerichte Vaardigheden
  | 'listen-summarize'
  | 'tongue-twisters'
  | 'sentence-puzzle'
  // Creatieve Oefeningen
  | 'proverbs-sayings';


export const ACTIVITY_CATEGORIES = [
    {
        categoryName: "Basis Oefeningen",
        activities: [
            { id: 'conversation', name: 'Vrije Conversatie', description: 'Voer een open gesprek over een willekeurig onderwerp.' },
            { id: 'vocabulary', name: 'Woordenschat', description: 'Leer nieuwe woorden met vertalingen en voorbeeldzinnen.' },
            { id: 'grammar', name: 'Grammatica', description: 'Krijg uitleg over een specifieke grammaticaregel.' },
            { id: 'culture', name: 'Cultuur', description: 'Leer een interessant weetje over de Nederlandse cultuur.' },
        ]
    },
    {
        categoryName: "Interactieve Scenario's & Real-Life Praktijk",
        activities: [
            { id: 'job-interview', name: 'De Sollicitatie', description: 'Oefen een sollicitatiegesprek waarin de AI de interviewer is.' },
            { id: 'making-complaint', name: 'Klacht Indienen', description: 'Leer hoe je beleefd maar duidelijk een klacht indient over een product of dienst.' },
            { id: 'expressing-opinion', name: 'Mening Geven', description: 'Onderbouw je mening over een stelling die de AI presenteert.' },
            { id: 'giving-instructions', name: 'Instructies Geven', description: 'Geef duidelijke, stapsgewijze instructies voor een alledaagse taak.' },
        ]
    },
    {
        categoryName: "Gerichte Vaardigheidsoefeningen",
        activities: [
            { id: 'listen-summarize', name: 'Luister & Vat Samen', description: 'De AI vertelt een kort verhaal; jij vat de belangrijkste punten samen.' },
            { id: 'tongue-twisters', name: 'Tongbrekers', description: 'Verbeter je uitspraak met klassieke Nederlandse tongbrekers.' },
            { id: 'sentence-puzzle', name: 'Zinsbouw Puzzel', description: 'Vorm een correcte zin met een reeks losse woorden van de AI.' },
        ]
    },
    {
        categoryName: "Creatieve & Speelse Oefeningen",
        activities: [
            { id: 'proverbs-sayings', name: 'Spreekwoorden & Gezegden', description: 'Leer de betekenis van Nederlandse spreekwoorden en gebruik ze in context.' },
        ]
    }
] as const;

// Flatten the categories to get a simple list of modes for iteration in other components
// FIX: The original flatMap had issues with type inference on readonly arrays from `as const`.
// Spreading the activities into a new array `[...category.activities]` resolves this.
export const ACTIVITY_MODES: ActivityMode[] = ACTIVITY_CATEGORIES.flatMap(category =>
  [...category.activities]
).map(activity => activity.id);

// Create a translation map for display purposes in other components
// FIX: The original flatMap had issues with type inference on readonly arrays from `as const`.
// Spreading the activities into a new array `[...c.activities]` resolves this.
export const ACTIVITY_MODE_TRANSLATIONS = Object.fromEntries(
    ACTIVITY_CATEGORIES.flatMap(c => [...c.activities]).map(a => [a.id, a.name])
) as Record<ActivityMode, string>;


export const THEMES = ['sky', 'rose', 'emerald', 'violet', 'amber'] as const;
export type Theme = typeof THEMES[number];

export interface TranscriptSource {
    uri: string;
    title: string;
}

export interface Transcript {
    speaker: 'user' | 'model' | 'system';
    text: string;
    sources?: TranscriptSource[];
}

export interface SavedConversation {
    id: string;
    date: string;
    level: CEFRLevel;
    activity: ActivityMode;
    transcripts: Transcript[];
    summary?: SessionSummary;
}

export interface ProgressData {
    stats?: {
        [key in CEFRLevel]?: {
            [key: string]: number; // ActivityMode is a string literal
        };
    };
    lastSessionDate?: string;
    currentStreak?: number;
    longestStreak?: number;
}

export interface WordDefinition {
    word: string;
    translation: string;
    example: string;
}

export interface SessionSummary {
    learningPoints: string;
    newVocabulary: WordDefinition[];
    suggestions: string;
}