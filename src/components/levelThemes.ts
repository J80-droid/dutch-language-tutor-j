import type { CSSProperties } from 'react';
import type { CEFRLevel } from '@/types';

export const LEVEL_THEMES: Record<
  CEFRLevel,
  {
    card: CSSProperties;
    cardSelected: CSSProperties;
    badge: CSSProperties;
    barGradient: string;
    background?: string;
    panelBackground?: string;
    panelBorder?: string;
    logoColor?: string;
    menuAccents?: string[];
  }
> = {
  A1: {
    card: {
      background: 'linear-gradient(140deg, rgba(94, 234, 212, 0.28), rgba(14, 165, 233, 0.12))',
      borderColor: 'rgba(14, 165, 233, 0.45)',
    },
    cardSelected: {
      borderColor: 'rgba(45, 212, 191, 0.85)',
      boxShadow: '0 22px 46px rgba(13, 148, 136, 0.32)',
    },
    badge: {
      background: 'rgba(45, 212, 191, 0.28)',
      borderColor: 'rgba(13, 148, 136, 0.45)',
    },
    barGradient: 'linear-gradient(90deg, rgba(20, 184, 166, 0.95), rgba(14, 165, 233, 0.8))',
    background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.9), rgba(20, 184, 166, 0.22))',
    panelBackground: 'linear-gradient(145deg, rgba(20, 184, 166, 0.18), rgba(14, 165, 233, 0.1))',
    panelBorder: 'rgba(20, 184, 166, 0.35)',
    logoColor: '#f8fafc',
    menuAccents: [
      'linear-gradient(135deg, rgba(20, 184, 166, 0.20), rgba(14, 165, 233, 0.10))',
      'linear-gradient(135deg, rgba(14, 165, 233, 0.22), rgba(56, 189, 248, 0.12))',
      'linear-gradient(135deg, rgba(94, 234, 212, 0.22), rgba(20, 184, 166, 0.12))',
      'linear-gradient(135deg, rgba(6, 182, 212, 0.22), rgba(14, 165, 233, 0.12))',
      'linear-gradient(135deg, rgba(45, 212, 191, 0.22), rgba(20, 184, 166, 0.12))',
      'linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(20, 184, 166, 0.12))',
    ],
  },
  A2: {
    card: {
      background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.18), rgba(15, 23, 42, 0.5))',
      borderColor: 'rgba(45, 212, 191, 0.4)',
    },
    cardSelected: {
      borderColor: 'rgba(45, 212, 191, 0.9)',
      boxShadow: '0 20px 40px rgba(45, 212, 191, 0.28)',
    },
    badge: {
      background: 'rgba(45, 212, 191, 0.22)',
      borderColor: 'rgba(16, 185, 129, 0.45)',
    },
    barGradient: 'linear-gradient(90deg, rgba(16, 185, 129, 0.95), rgba(45, 212, 191, 0.85))',
    background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.92), rgba(16, 185, 129, 0.18))',
    panelBackground: 'linear-gradient(150deg, rgba(16, 185, 129, 0.18), rgba(45, 212, 191, 0.08))',
    panelBorder: 'rgba(45, 212, 191, 0.3)',
  },
  B1: {
    card: {
      background: 'linear-gradient(140deg, rgba(99, 102, 241, 0.26), rgba(55, 65, 194, 0.12))',
      borderColor: 'rgba(79, 70, 229, 0.45)',
    },
    cardSelected: {
      borderColor: 'rgba(129, 140, 248, 0.9)',
      boxShadow: '0 22px 46px rgba(79, 70, 229, 0.32)',
    },
    badge: {
      background: 'rgba(79, 70, 229, 0.28)',
      borderColor: 'rgba(99, 102, 241, 0.45)',
    },
    barGradient: 'linear-gradient(90deg, rgba(79, 70, 229, 0.95), rgba(165, 180, 252, 0.8))',
    background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.9), rgba(79, 70, 229, 0.2))',
    panelBackground: 'linear-gradient(145deg, rgba(79, 70, 229, 0.2), rgba(99, 102, 241, 0.08))',
    panelBorder: 'rgba(129, 140, 248, 0.32)',
    logoColor: '#c7d2fe',
    menuAccents: [
      'linear-gradient(135deg, rgba(79, 70, 229, 0.24), rgba(129, 140, 248, 0.12))',
      'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(165, 180, 252, 0.12))',
      'linear-gradient(135deg, rgba(55, 65, 194, 0.24), rgba(99, 102, 241, 0.12))',
      'linear-gradient(135deg, rgba(129, 140, 248, 0.26), rgba(79, 70, 229, 0.12))',
      'linear-gradient(135deg, rgba(102, 126, 234, 0.24), rgba(118, 75, 162, 0.12))',
      'linear-gradient(135deg, rgba(165, 180, 252, 0.24), rgba(129, 140, 248, 0.12))',
    ],
  },
  B2: {
    card: {
      background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.2), rgba(15, 23, 42, 0.5))',
      borderColor: 'rgba(250, 204, 21, 0.45)',
    },
    cardSelected: {
      borderColor: 'rgba(251, 191, 36, 0.95)',
      boxShadow: '0 20px 42px rgba(250, 204, 21, 0.3)',
    },
    badge: {
      background: 'rgba(251, 191, 36, 0.25)',
      borderColor: 'rgba(250, 204, 21, 0.45)',
    },
    barGradient: 'linear-gradient(90deg, rgba(251, 191, 36, 0.95), rgba(250, 204, 21, 0.85))',
    background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.92), rgba(250, 204, 21, 0.18))',
    panelBackground: 'linear-gradient(150deg, rgba(250, 204, 21, 0.18), rgba(253, 224, 71, 0.08))',
    panelBorder: 'rgba(251, 191, 36, 0.3)',
  },
  C1: {
    card: {
      background: 'linear-gradient(135deg, rgba(244, 114, 182, 0.22), rgba(15, 23, 42, 0.5))',
      borderColor: 'rgba(244, 114, 182, 0.42)',
    },
    cardSelected: {
      borderColor: 'rgba(236, 72, 153, 0.92)',
      boxShadow: '0 20px 42px rgba(236, 72, 153, 0.3)',
    },
    badge: {
      background: 'rgba(236, 72, 153, 0.28)',
      borderColor: 'rgba(244, 114, 182, 0.5)',
    },
    barGradient: 'linear-gradient(90deg, rgba(236, 72, 153, 0.95), rgba(244, 114, 182, 0.85))',
    background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.92), rgba(236, 72, 153, 0.18))',
    panelBackground: 'linear-gradient(150deg, rgba(236, 72, 153, 0.2), rgba(244, 114, 182, 0.08))',
    panelBorder: 'rgba(236, 72, 153, 0.32)',
  },
  C2: {
    card: {
      background: 'linear-gradient(140deg, rgba(37, 99, 235, 0.22), rgba(30, 64, 175, 0.12))',
      borderColor: 'rgba(37, 99, 235, 0.45)',
    },
    cardSelected: {
      borderColor: 'rgba(59, 130, 246, 0.92)',
      boxShadow: '0 22px 48px rgba(37, 99, 235, 0.34)',
    },
    badge: {
      background: 'rgba(37, 99, 235, 0.26)',
      borderColor: 'rgba(59, 130, 246, 0.45)',
    },
    barGradient: 'linear-gradient(90deg, rgba(30, 64, 175, 0.95), rgba(37, 99, 235, 0.8))',
    background: 'linear-gradient(170deg, rgba(15, 23, 42, 0.92), rgba(30, 64, 175, 0.24))',
    panelBackground: 'linear-gradient(150deg, rgba(30, 64, 175, 0.2), rgba(37, 99, 235, 0.08))',
    panelBorder: 'rgba(37, 99, 235, 0.35)',
    logoColor: '#dbeafe',
    menuAccents: [
      'linear-gradient(135deg, rgba(30, 64, 175, 0.24), rgba(37, 99, 235, 0.12))',
      'linear-gradient(135deg, rgba(37, 99, 235, 0.26), rgba(96, 165, 250, 0.12))',
      'linear-gradient(135deg, rgba(14, 116, 144, 0.24), rgba(37, 99, 235, 0.12))',
      'linear-gradient(135deg, rgba(59, 130, 246, 0.24), rgba(37, 99, 235, 0.12))',
      'linear-gradient(135deg, rgba(96, 165, 250, 0.24), rgba(37, 99, 235, 0.12))',
      'linear-gradient(135deg, rgba(37, 99, 235, 0.28), rgba(30, 64, 175, 0.14))',
    ],
  },
};

