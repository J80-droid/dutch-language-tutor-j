export type QuestionType = 
    | 'fill' 
    | 'multiple-choice' 
    | 'checkbox'
    | 'swipe-sort'
    | 'memory-match'
    | 'jigsaw'
    | 'dictation'
    | 'image-description'
    | 'transformation'
    | 'word-math';

export interface ExerciseQuestion {
    id: string;
    type: QuestionType;
    questionText: string;
    options?: string[]; // Voor multiple-choice en checkbox
    correctAnswer: string | string[]; // String voor fill/multiple-choice, array voor checkbox
    explanation?: string; // Uitleg bij het correcte antwoord
    
    // Swipe-sort specifiek
    swipeTargets?: string[]; // ['de', 'het'] voor swipe oefeningen
    swipeItems?: Array<{ word: string; correctTarget: string }>; // Woorden met correcte target
    
    // Memory-match specifiek
    memoryPairs?: Array<{ card1: string; card2: string }>; // Paren voor memory spel
    
    // Jigsaw specifiek
    jigsawPieces?: string[]; // Losse woorden/zinsdelen
    jigsawCorrectOrder?: number[]; // Correcte volgorde indices
    
    // Dictation specifiek
    dictationAudioUrl?: string; // URL naar audio bestand
    dictationText?: string; // Volledige tekst voor verificatie
    
    // Image-description specifiek
    imageUrl?: string; // URL naar afbeelding
    imageDescription?: string; // Beschrijving van afbeelding
    
    // Transformation specifiek
    sourceTense?: string; // Bijv. 'present', 'past'
    targetTense?: string; // Bijv. 'perfectum', 'imperfectum'
    sourceText?: string; // Originele tekst
    
    // Word-math specifiek
    wordMathParts?: Array<{ part1: string; part2: string; result: string }>; // Samenstellingen
}

export interface ExerciseData {
    introduction: string;
    explanation: string; // Algemene uitleg voor de popup
    questions: ExerciseQuestion[]; // Altijd 10 vragen
    instructions?: string; // Algemene instructies
}

export interface UserAnswers {
    [questionId: string]: string | string[]; // Antwoord per vraag ID
}

export interface QuestionFeedback {
    questionId: string;
    isCorrect: boolean;
    userAnswer: string | string[];
    correctAnswer: string | string[];
    explanation?: string;
}

export interface FeedbackReport {
    score: number; // 0-100
    totalQuestions: number;
    correctAnswers: number;
    questionFeedback: QuestionFeedback[];
    generalFeedback: string;
    tips: string[];
}

