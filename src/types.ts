export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CEFRLevel = typeof CEFR_LEVELS[number];

export const CEFR_SKILLS = [
    'listening',
    'reading',
    'speakingProduction',
    'speakingInteraction',
    'writing',
] as const;
export type CEFRSkill = typeof CEFR_SKILLS[number];

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
  // Extra oefeningen
  | 'extra-practice'
  // Creatieve & Speelse Oefeningen
  | 'creative-improvisation'
  | 'creative-story-relay'
  | 'creative-escape-room'
  | 'creative-emotion-barometer'
  | 'creative-keyword-wheel'
  | 'proverbs-sayings'
  // Tekstgerichte Extra Oefeningen
  | 'extra-practice';

export type CreativeActivityMode =
  | 'creative-improvisation'
  | 'creative-story-relay'
  | 'creative-escape-room'
  | 'creative-emotion-barometer'
  | 'creative-keyword-wheel';

export type CreativeDifficulty = 'makkelijk' | 'gemiddeld' | 'uitdagend';

export interface CreativeWorkshopBaseConfig {
  level: CEFRLevel;
  participants: number;
  difficulty: CreativeDifficulty;
  durationMinutes?: number;
  includeWarmup?: boolean;
}

export interface CreativeImprovSetup {
  warmUps: string[];
  roleCards: Array<{
    role: string;
    emotion: string;
    location: string;
    prop?: string;
    twist?: string;
  }>;
  sceneSeeds: string[];
  coachingTips: string[];
  reflectionPrompts: string[];
}

export interface CreativeStoryRelaySetup {
  openingLine: string;
  narrativeBeats: string[];
  twistCards: string[];
  genreSuggestions: string[];
  wrapUpPrompts: string[];
}

export interface CreativeEscapeRoomSetup {
  scenario: string;
  timeLimitMinutes: number;
  puzzles: Array<{
    clue: string;
    answer: string;
    languageFocus: string;
    hint?: string;
  }>;
  finale: string;
  supportTips: string[];
}

export interface CreativeEmotionBarometerSetup {
  neutralSentences: string[];
  emotionCards: Array<{
    emotion: string;
    vocalStyle: string;
    bodyLanguage: string;
    escalation?: string;
  }>;
  feedbackChecklist: string[];
  reflectionQuestions: string[];
}

export interface CreativeKeywordWheelSetup {
  slices: Array<{
    label: string;
    keywords: string[];
    challenge?: string;
  }>;
  followUpTasks: string[];
  collaborativeGames: string[];
  reflectionPrompts: string[];
}

export type CreativeActivityConfigMap = {
  'creative-improvisation': CreativeWorkshopBaseConfig & {
    rounds: number;
    includeProps: boolean;
  };
  'creative-story-relay': CreativeWorkshopBaseConfig & {
    storyLength: 'kort' | 'midden' | 'lang';
    allowTwists: boolean;
  };
  'creative-escape-room': CreativeWorkshopBaseConfig & {
    puzzleCount: number;
    allowHints: boolean;
  };
  'creative-emotion-barometer': CreativeWorkshopBaseConfig & {
    emotionCount: number;
    sentenceSource: 'ai' | 'custom';
  };
  'creative-keyword-wheel': CreativeWorkshopBaseConfig & {
    spins: number;
    includeMiniChallenges: boolean;
  };
};

export type CreativeActivitySetupMap = {
  'creative-improvisation': CreativeImprovSetup;
  'creative-story-relay': CreativeStoryRelaySetup;
  'creative-escape-room': CreativeEscapeRoomSetup;
  'creative-emotion-barometer': CreativeEmotionBarometerSetup;
  'creative-keyword-wheel': CreativeKeywordWheelSetup;
};

export type CreativeWorkshopConfig<T extends CreativeActivityMode = CreativeActivityMode> =
  CreativeActivityConfigMap[T];

export type CreativeWorkshopSetup<T extends CreativeActivityMode = CreativeActivityMode> =
  CreativeActivitySetupMap[T];

export interface CreativeWorkshopState<T extends CreativeActivityMode = CreativeActivityMode> {
  mode: T;
  config: CreativeActivityConfigMap[T];
  setup: CreativeActivitySetupMap[T] | null;
  lastGeneratedAt?: string;
}

export interface CreativeWorkshopSnapshot {
  active?: CreativeWorkshopState | null;
  history?: CreativeWorkshopState[];
}


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
        categoryName: "Extra Oefeningen",
        activities: [
            {
                id: 'extra-practice',
                name: 'Extra oefeningen',
                description: 'Oefeningen zonder microfoon',
            },
        ],
    },
    {
        categoryName: "Creatieve & Speelse Oefeningen",
        activities: [
            { id: 'creative-improvisation', name: 'Improvisatierondes', description: 'Trek willekeurige rolkaartjes (beroep, emotie, locatie) en speel een mini-scène.' },
            { id: 'creative-story-relay', name: 'Verhalenestafette', description: 'Bouw samen een verhaal op door om de beurt een zin toe te voegen of variaties te introduceren.' },
            { id: 'creative-escape-room', name: 'Escape-taalspel', description: 'Los taalpuzzels, raadsels en codes op om uit een scenario te ontsnappen.' },
            { id: 'creative-emotion-barometer', name: 'Emotiebarometer', description: 'Speel alledaagse zinnen met verschillende emoties en bespreek de impact.' },
            { id: 'creative-keyword-wheel', name: 'Geluksrad met Trefwoorden', description: 'Draai aan een rad om thema\'s en woordenschat te combineren in mini-opdrachten.' },
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


export const LEARNING_GOALS = [
    'fluency',
    'vocabulary',
    'listening',
    'pronunciation',
    'grammar-accuracy',
    'confidence',
    'interaction-strategies',
    'cultural-awareness',
    'exam-prep',
    'business-dutch',
] as const;
export type LearningGoal = typeof LEARNING_GOALS[number];

export const LEARNING_GOAL_METADATA: Record<LearningGoal, { label: string; description: string }> = {
    fluency: {
        label: 'Vloeiendheid',
        description: 'Focus op vloeiend en spontaan spreken zonder lange pauzes.',
    },
    vocabulary: {
        label: 'Woordenschat',
        description: 'Leer en gebruik nieuwe woorden rond een gekozen onderwerp.',
    },
    listening: {
        label: 'Luistervaardigheid',
        description: 'Concentreer je op begrip en het herformuleren van wat je hoort.',
    },
    pronunciation: {
        label: 'Uitspraak',
        description: 'Werk aan klanken, klemtoon en intonatie voor duidelijke communicatie.',
    },
    'grammar-accuracy': {
        label: 'Grammaticale nauwkeurigheid',
        description: 'Leg de nadruk op correcte zinsbouw, werkwoordstijden en verbuigingen.',
    },
    confidence: {
        label: 'Zelfvertrouwen',
        description: 'Stimuleer langere beurten, positieve feedback en durf om fouten te maken.',
    },
    'interaction-strategies': {
        label: 'Interactiestrategieën',
        description: 'Oefen vragen stellen, verduidelijking vragen en beurtwisseling.',
    },
    'cultural-awareness': {
        label: 'Cultureel bewustzijn',
        description: 'Let op toon, beleefdheidsvormen en culturele referenties.',
    },
    'exam-prep': {
        label: 'Examentraining',
        description: 'Bereid voor op CEFR-examens met taakgerichte feedback.',
    },
    'business-dutch': {
        label: 'Zakelijk Nederlands',
        description: 'Pas taalgebruik aan voor professionele contexten en formele situaties.',
    },
};

export const FEEDBACK_ASPECTS = [
    'grammar',
    'pronunciation',
    'fluency',
    'vocabulary',
    'tone',
] as const;
export type FeedbackAspect = typeof FEEDBACK_ASPECTS[number];

export type StrictnessLevel = 1 | 2 | 3 | 4 | 5;

export type FeedbackStrictnessSettings = Record<FeedbackAspect, StrictnessLevel>;

export const DEFAULT_FEEDBACK_STRICTNESS: FeedbackStrictnessSettings = {
    grammar: 3,
    pronunciation: 3,
    fluency: 3,
    vocabulary: 3,
    tone: 3,
};

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
    goal?: LearningGoal;
    transcripts: Transcript[];
    summary?: SessionSummary;
    metrics?: ConversationMetrics;
    closingReflection?: string;
    news?: SavedConversationNews;
}

export interface ConversationMetrics {
    totalDurationMs: number;
    userTalkMs: number;
    tutorTalkMs: number;
    userTalkShare: number;
    topicHistory?: string[];
    goal?: LearningGoal;
}

export interface SavedConversationNews {
    headline: string;
    source: string;
    sourceNote: string;
    articleUrl?: string;
    publishedAt?: string | null;
    summary?: string;
}

export interface ProgressData {
    stats?: {
        [key in CEFRLevel]?: {
            [key: string]: number; // ActivityMode is a string literal
        };
    };
    mastery?: {
        [key in CEFRLevel]?: {
            skills: {
                [skill in CEFRSkill]: {
                    exposure: number;
                };
            };
        };
    };
    lastSessionDate?: string;
    currentStreak?: number;
    longestStreak?: number;
    lastWeeklySessionDate?: string;
    currentWeeklyStreak?: number;
    longestWeeklyStreak?: number;
    streakMilestonesUnlocked?: number[];
}

export type StreakPeriod = 'daily' | 'weekly';

export interface StreakLogEntry {
    date: string;
    period: StreakPeriod;
    delta: number;
    reason?: string;
}

export interface StreakStats {
    period: StreakPeriod;
    current: number;
    longest: number;
    lastCompletedDate?: string;
    history: StreakLogEntry[];
}

export interface StreakState {
    daily: StreakStats;
    weekly: StreakStats;
    lastUpdated: string;
}

export type GamificationXPSource = 'session' | 'mission' | 'badge' | 'minigame' | 'bonus';

export interface GamificationXPEntry {
    id: string;
    amount: number;
    source: GamificationXPSource;
    createdAt: string;
    metadata?: Record<string, unknown>;
}

export interface XPState {
    total: number;
    level: number;
    levelProgress: number;
    history: GamificationXPEntry[];
    lastEarnedAt?: string;
}

export type MissionStatus = 'locked' | 'active' | 'completed' | 'expired';

export type MissionObjectiveMetric = 'sessions' | 'words' | 'duration' | 'custom';

export interface MissionObjective {
    id: string;
    description: string;
    metric: MissionObjectiveMetric;
    progress: number;
    target: number;
    completedAt?: string;
    metadata?: Record<string, unknown>;
}

export interface MissionReward {
    xp: number;
    badges?: string[];
    themeUnlocks?: Theme[];
    metadata?: Record<string, unknown>;
}

export interface MissionProgress {
    id: string;
    title: string;
    description: string;
    level: CEFRLevel;
    activity?: ActivityMode;
    goal?: LearningGoal;
    status: MissionStatus;
    assignedAt: string;
    expiresAt?: string;
    completedAt?: string;
    objectives: MissionObjective[];
    reward: MissionReward;
}

export type BadgeCategory = 'skill' | 'consistency' | 'event' | 'seasonal' | 'special';

export interface BadgeProgress {
    id: string;
    name: string;
    description: string;
    category: BadgeCategory;
    unlockedAt?: string;
    progress?: number;
    target?: number;
    hint?: string;
    isSecret?: boolean;
    metadata?: Record<string, unknown>;
}

export type MinigameType = 'vocab-quiz' | 'cloze' | 'memory' | 'custom';

export interface MinigameResult {
    id: string;
    type: MinigameType;
    conversationId?: string;
    score: number;
    maxScore: number;
    playedAt: string;
    durationMs?: number;
    metadata?: Record<string, unknown>;
}

export type SeasonalEventStatus = 'upcoming' | 'active' | 'completed';

export interface SeasonalEventProgress {
    id: string;
    name: string;
    description: string;
    theme?: Theme;
    startsAt: string;
    endsAt: string;
    status: SeasonalEventStatus;
    progress?: number;
    rewards?: MissionReward;
    metadata?: Record<string, unknown>;
}

export type NotificationReminderType = 'streak-warning' | 'mission-deadline' | 'seasonal-event' | 'daily-check-in';

export interface NotificationReminder {
    id: string;
    type: NotificationReminderType;
    scheduledFor: string;
    delivered?: boolean;
    payload?: Record<string, unknown>;
    createdAt: string;
}

export interface NotificationState {
    permission: 'default' | 'granted' | 'denied';
    lastPromptAt?: string;
    reminders: NotificationReminder[];
}

export interface ProgressSnapshot {
    data: ProgressData;
    updatedAt: string;
}

export interface GamificationData {
    version: number;
    streaks: StreakState;
    xp: XPState;
    missions: MissionProgress[];
    badges: BadgeProgress[];
    minigames: MinigameResult[];
    seasonalEvents: SeasonalEventProgress[];
    notifications: NotificationState;
    lastProgressSnapshot?: ProgressSnapshot;
    lastSyncedAt?: string;
}

export interface StreakMilestoneUnlock {
    period: StreakPeriod;
    value: number;
    reachedAt: string;
}

export interface StreakDeadline {
    period: StreakPeriod;
    deadline: string;
    leadMs: number;
}

export interface StreakUpdateSummary {
    daily: StreakStats;
    weekly: StreakStats;
    milestonesUnlocked: StreakMilestoneUnlock[];
    deadlines: StreakDeadline[];
}

export interface WordDefinition {
    word: string;
    translation: string;
    example: string;
}

export type GoalFeedbackIssueSeverity = 'laag' | 'middel' | 'hoog';

export interface GoalFeedbackIssue {
    note: string;
    quote?: string;
    correction?: string;
    severity?: GoalFeedbackIssueSeverity;
}

export interface GoalFeedback {
    goal: LearningGoal;
    label?: string;
    summary: string;
    score: number;
    scoreLabel: string;
    strictnessNote?: string;
    issues: GoalFeedbackIssue[];
}

export interface SessionSummary {
    learningPoints: string;
    newVocabulary: WordDefinition[];
    suggestions: string;
    goalFeedback?: GoalFeedback[];
}