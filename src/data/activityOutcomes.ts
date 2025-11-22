import type { ActivityMode, CEFRLevel, CEFRSkill } from '@/types';

export interface ActivityOutcome {
  level: CEFRLevel;
  skills: CEFRSkill[];
  weight?: number;
}

export type ActivityOutcomeMapping = Record<ActivityMode, ActivityOutcome[]>;

export const activityOutcomes: ActivityOutcomeMapping = {
  conversation: [
    { level: 'A2', skills: ['speakingInteraction', 'speakingProduction'], weight: 0.4 },
    { level: 'B1', skills: ['speakingInteraction', 'speakingProduction'], weight: 0.4 },
    { level: 'B2', skills: ['listening', 'speakingInteraction'], weight: 0.2 },
  ],
  vocabulary: [
    { level: 'A1', skills: ['reading', 'writing'], weight: 0.3 },
    { level: 'A2', skills: ['reading', 'writing'], weight: 0.3 },
    { level: 'B1', skills: ['reading', 'speakingProduction'], weight: 0.4 },
  ],
  grammar: [
    { level: 'A2', skills: ['writing', 'speakingProduction'], weight: 0.4 },
    { level: 'B1', skills: ['writing', 'speakingProduction'], weight: 0.4 },
    { level: 'B2', skills: ['writing'], weight: 0.2 },
  ],
  culture: [
    { level: 'B1', skills: ['reading', 'listening'], weight: 0.4 },
    { level: 'B2', skills: ['reading', 'listening'], weight: 0.3 },
    { level: 'C1', skills: ['reading', 'listening'], weight: 0.3 },
  ],
  'job-interview': [
    { level: 'B2', skills: ['speakingProduction', 'speakingInteraction'], weight: 0.6 },
    { level: 'C1', skills: ['speakingInteraction', 'listening'], weight: 0.4 },
  ],
  'making-complaint': [
    { level: 'B1', skills: ['speakingInteraction', 'writing'], weight: 0.5 },
    { level: 'B2', skills: ['speakingInteraction', 'speakingProduction'], weight: 0.5 },
  ],
  'expressing-opinion': [
    { level: 'B1', skills: ['speakingProduction', 'speakingInteraction'], weight: 0.4 },
    { level: 'B2', skills: ['speakingProduction', 'writing'], weight: 0.4 },
    { level: 'C1', skills: ['speakingProduction'], weight: 0.2 },
  ],
  'giving-instructions': [
    { level: 'A2', skills: ['speakingProduction', 'speakingInteraction'], weight: 0.5 },
    { level: 'B1', skills: ['speakingProduction', 'listening'], weight: 0.5 },
  ],
  'listen-summarize': [
    { level: 'B1', skills: ['listening', 'speakingProduction'], weight: 0.5 },
    { level: 'B2', skills: ['listening', 'writing'], weight: 0.5 },
  ],
  'tongue-twisters': [
    { level: 'A2', skills: ['speakingProduction'], weight: 0.6 },
    { level: 'B1', skills: ['speakingProduction'], weight: 0.4 },
  ],
  'sentence-puzzle': [
    { level: 'A1', skills: ['writing', 'reading'], weight: 0.5 },
    { level: 'A2', skills: ['writing', 'reading'], weight: 0.5 },
  ],
  'creative-improvisation': [
    { level: 'B1', skills: ['speakingProduction', 'speakingInteraction'], weight: 0.5 },
    { level: 'B2', skills: ['speakingProduction', 'speakingInteraction'], weight: 0.3 },
    { level: 'C1', skills: ['speakingInteraction'], weight: 0.2 },
  ],
  'creative-story-relay': [
    { level: 'B1', skills: ['speakingProduction', 'writing'], weight: 0.4 },
    { level: 'B2', skills: ['speakingProduction', 'writing'], weight: 0.4 },
    { level: 'C1', skills: ['speakingProduction'], weight: 0.2 },
  ],
  'creative-escape-room': [
    { level: 'B1', skills: ['reading', 'speakingInteraction'], weight: 0.4 },
    { level: 'B2', skills: ['reading', 'speakingInteraction'], weight: 0.4 },
    { level: 'C1', skills: ['reading', 'speakingInteraction'], weight: 0.2 },
  ],
  'creative-emotion-barometer': [
    { level: 'B1', skills: ['speakingProduction', 'speakingInteraction'], weight: 0.5 },
    { level: 'B2', skills: ['speakingProduction', 'speakingInteraction'], weight: 0.3 },
    { level: 'C1', skills: ['speakingInteraction'], weight: 0.2 },
  ],
  'creative-keyword-wheel': [
    { level: 'A2', skills: ['speakingProduction', 'speakingInteraction'], weight: 0.4 },
    { level: 'B1', skills: ['speakingProduction', 'writing'], weight: 0.4 },
    { level: 'B2', skills: ['speakingProduction'], weight: 0.2 },
  ],
  'proverbs-sayings': [
    { level: 'B1', skills: ['reading', 'speakingProduction'], weight: 0.5 },
    { level: 'B2', skills: ['reading', 'speakingProduction'], weight: 0.3 },
    { level: 'C1', skills: ['speakingProduction'], weight: 0.2 },
  ],
};

export const getActivityOutcomes = (mode: ActivityMode): ActivityOutcome[] =>
  activityOutcomes[mode] ?? [];

