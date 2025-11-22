export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string; // Emoji of icon identifier
    unlockedAt?: number; // Timestamp
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    type: 'streak' | 'exercises' | 'score' | 'category' | 'special';
    requirement: number; // Bijv. 7 dagen streak, 100 oefeningen, etc.
    unlockedAt?: number;
}

export interface StreakData {
    currentStreak: number; // Dagen op rij
    longestStreak: number; // Langste streak ooit
    lastActivityDate: number; // Timestamp van laatste activiteit
}

export interface GamificationState {
    badges: Badge[];
    achievements: Achievement[];
    streak: StreakData;
    totalPoints: number;
    level: number; // Gebaseerd op totale punten
}

export const BADGE_DEFINITIONS: Badge[] = [
    { id: 'first-exercise', name: 'Eerste Stap', description: 'Voltooi je eerste oefening', icon: '🎯' },
    { id: 'week-streak', name: 'Week Warrior', description: '7 dagen op rij geoefend', icon: '🔥' },
    { id: 'month-streak', name: 'Maand Meester', description: '30 dagen op rij geoefend', icon: '⭐' },
    { id: 'perfect-score', name: 'Perfect', description: 'Krijg 100% op een oefening', icon: '💯' },
    { id: 'de-het-master', name: 'De/Het Meester', description: 'Voltooi 10 de/het oefeningen', icon: '📚' },
    { id: 'grammar-guru', name: 'Grammatica Guru', description: 'Voltooi 50 grammatica oefeningen', icon: '📖' },
    { id: 'vocab-virtuoso', name: 'Woordenschat Virtuoos', description: 'Leer 100 nieuwe woorden', icon: '📝' },
    { id: 'speed-demon', name: 'Snelheidsduivel', description: 'Voltooi 10 oefeningen in één dag', icon: '⚡' },
];

export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
    { id: 'ach-1', name: 'Beginneling', description: 'Voltooi 10 oefeningen', type: 'exercises', requirement: 10 },
    { id: 'ach-2', name: 'Doorzetter', description: 'Voltooi 50 oefeningen', type: 'exercises', requirement: 50 },
    { id: 'ach-3', name: 'Expert', description: 'Voltooi 100 oefeningen', type: 'exercises', requirement: 100 },
    { id: 'ach-4', name: 'Master', description: 'Voltooi 500 oefeningen', type: 'exercises', requirement: 500 },
    { id: 'ach-streak-7', name: 'Week Streak', description: '7 dagen op rij', type: 'streak', requirement: 7 },
    { id: 'ach-streak-30', name: 'Maand Streak', description: '30 dagen op rij', type: 'streak', requirement: 30 },
    { id: 'ach-streak-100', name: 'Legende', description: '100 dagen op rij', type: 'streak', requirement: 100 },
    { id: 'ach-score-90', name: 'Uitstekend', description: 'Gemiddelde score van 90%+', type: 'score', requirement: 90 },
];

