import React from 'react';
import {
  ACTIVITY_MODE_TRANSLATIONS,
  CEFR_LEVELS,
  CEFRLevel,
  ProgressData,
  Theme,
  CEFR_SKILLS,
  CEFRSkill,
} from '../types';
import { XPLevelProgress } from '../utils/gamificationUtils';
import { LEVEL_THEMES } from './levelThemes';
import { calculateMasterySnapshot } from '@/utils/progressUtils';
import { cefrDescriptors } from '@/data/cefrDescriptors';

interface Props {
  progress: ProgressData;
  selectedLevel: CEFRLevel;
  onSelectLevel?: (level: CEFRLevel) => void;
  levelProgress: XPLevelProgress;
  nextThemeUnlock?: { theme: Theme; requiredLevel: number } | null;
  themeUnlockLevels: Record<Theme, number>;
}


const LevelProgressPreview: React.FC<Props> = ({
  progress,
  selectedLevel,
  onSelectLevel,
  levelProgress,
  nextThemeUnlock,
  themeUnlockLevels,
}) => {
  const stats = progress.stats ?? {};
  const totalSessionsPerLevel = CEFR_LEVELS.map((level): number => {
    const levelStats = stats[level] ?? ({} as Record<string, number>);
    const values = Object.values(levelStats) as number[];
    return values.reduce((sum, value) => sum + value, 0);
  });
  const progressPercent = Math.round(Math.min(levelProgress.progress * 100, 100));
  const xpForNextLevel = levelProgress.xpForNextLevel || 0;
  const themeUnlockEntries = Object.entries(themeUnlockLevels)
    .map(([theme, requiredLevel]) => [theme as Theme, requiredLevel] as [Theme, number])
    .sort(([, levelA], [, levelB]) => levelA - levelB);

  const masterySnapshot = calculateMasterySnapshot(progress);

  const formatThemeLabel = (theme: Theme) => theme.replace(/-/g, ' ');

  const SKILL_LABELS: Record<CEFRSkill, string> = {
    listening: 'Luisteren',
    reading: 'Lezen',
    speakingProduction: 'Spreken (productie)',
    speakingInteraction: 'Spreken (interactie)',
    writing: 'Schrijven',
  };

  const getPrimarySkill = (level: CEFRLevel): CEFRSkill | null => {
    const mastery = masterySnapshot[level];
    if (!mastery) {
      return null;
    }
    let topSkill: CEFRSkill | null = null;
    let topValue = -1;
    CEFR_SKILLS.forEach(skill => {
      const value = mastery.skills[skill] ?? 0;
      if (value > topValue) {
        topValue = value;
        topSkill = skill;
      }
    });
    return topValue > 0 ? topSkill : null;
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h3 style={styles.title}>Voortgang per niveau per CEFR-niveau</h3>
      </div>
      <div style={styles.levelSummary}>
        <div style={styles.levelSummaryHeader}>
          <span style={styles.levelBadgePrimary}>Coach level {levelProgress.level}</span>
          <span style={styles.levelXpMeta}>
            {levelProgress.xpIntoLevel} / {xpForNextLevel || '--'} XP voor level {levelProgress.level + 1}
          </span>
        </div>
        <div style={styles.levelProgressTrack}>
          <div style={{ ...styles.levelProgressFill, width: `${progressPercent}%` }} />
        </div>
        <div style={styles.levelMetaRow}>
          <span>{progressPercent}% naar level {levelProgress.level + 1}</span>
          {nextThemeUnlock ? (
            <span>
              Volgende thema: {formatThemeLabel(nextThemeUnlock.theme)} · level {nextThemeUnlock.requiredLevel}
            </span>
          ) : (
            <span>Alle thema’s zijn ontgrendeld</span>
          )}
        </div>
        <div style={styles.themeUnlockRow}>
          {themeUnlockEntries.map(([theme, requiredLevel]) => {
            const unlocked = levelProgress.level >= requiredLevel;
            return (
              <span
                key={theme}
                style={{
                  ...styles.themeUnlockPill,
                  ...(unlocked ? styles.themeUnlockUnlocked : styles.themeUnlockLocked),
                }}
              >
                {formatThemeLabel(theme)} · L{requiredLevel}
              </span>
            );
          })}
        </div>
      </div>
      <div style={styles.grid}>
        {CEFR_LEVELS.map((level, index) => {
          const levelStats = stats[level] ?? ({} as Record<string, number>);
          const entries = Object.entries(levelStats) as Array<[string, number]>;
          const totalSessions = totalSessionsPerLevel[index] ?? 0;
          const mastery = masterySnapshot[level];
          const completionPercent = mastery ? Math.round(mastery.overall) : 0;
          const hasSessions = totalSessions > 0;
          const topEntry = entries
            .slice()
            .sort(([, a], [, b]) => b - a)
            .find(([, value]) => value > 0);
          const primarySkill = getPrimarySkill(level);

          const isSelected = level === selectedLevel;
          const isClickable = typeof onSelectLevel === 'function';
          const cardProps = isClickable
            ? {
                role: 'button' as const,
                tabIndex: 0,
                onClick: () => onSelectLevel(level),
                onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectLevel(level);
                  }
                },
              }
            : {};

          const theme = LEVEL_THEMES[level];
          const cardBaseStyle = {
            ...styles.card,
            ...(theme?.card ?? {}),
            ...(isClickable ? styles.cardInteractive : {}),
          };
          const cardStyle = isSelected
            ? { ...cardBaseStyle, ...styles.cardSelected, ...(theme?.cardSelected ?? {}) }
            : cardBaseStyle;
          const badgeStyle = { ...styles.levelBadge, ...(theme?.badge ?? {}) };
          const sessionBarFillStyle = {
            ...styles.sessionBarFill,
            background: theme?.barGradient ?? styles.sessionBarFill.background,
          };

          return (
            <div
              key={level}
              style={cardStyle}
              {...cardProps}
            >
              <div style={badgeStyle}>{level}</div>
              <div style={styles.sessionMetaRow}>
                <span style={styles.sessionCountLabel}>{`${totalSessions} sessies`}</span>
                <span style={styles.sessionPercentLabel}>{completionPercent}%</span>
              </div>
              <div style={styles.sessionBarTrack} aria-hidden="true">
                <div
                  style={{
                    ...sessionBarFillStyle,
                    width: `${hasSessions ? completionPercent : 8}%`,
                    opacity: hasSessions ? 1 : 0.35,
                  }}
                />
              </div>
              {topEntry && (
                <div style={styles.topActivity}>
                  Populairst: {ACTIVITY_MODE_TRANSLATIONS[topEntry[0] as keyof typeof ACTIVITY_MODE_TRANSLATIONS]}
                </div>
              )}
              {primarySkill && (
                <div
                  style={styles.masteryHighlight}
                  title={cefrDescriptors[level][primarySkill]}
                >
                  Kernvaardigheid: {SKILL_LABELS[primarySkill]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
  },
  levelSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '16px',
    borderRadius: '16px',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(14, 165, 233, 0.12))',
    boxShadow: '0 12px 28px rgba(14, 165, 233, 0.25)',
  },
  levelSummaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '12px',
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    fontSize: '1em',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-primary)',
  },
  levelBadgePrimary: {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-primary-text)',
    borderRadius: '999px',
    padding: '6px 14px',
    fontWeight: 700,
    fontSize: '0.95em',
  },
  levelXpMeta: {
    fontSize: '0.85em',
    opacity: 0.8,
  },
  levelProgressTrack: {
    position: 'relative',
    width: '100%',
    height: '10px',
    borderRadius: '999px',
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, var(--color-primary), rgba(59, 130, 246, 0.8))',
    transition: 'width 0.3s ease',
  },
  levelMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    fontSize: '0.85em',
    opacity: 0.8,
    flexWrap: 'wrap',
  },
  themeUnlockRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  themeUnlockPill: {
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '0.75em',
    border: '1px solid transparent',
    textTransform: 'capitalize',
  },
  themeUnlockUnlocked: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    color: 'var(--color-text)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  themeUnlockLocked: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    color: 'rgba(148, 163, 184, 0.8)',
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '14px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '16px',
    borderRadius: '18px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.12), rgba(148, 163, 184, 0.05))',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.25)',
    color: 'var(--color-text)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  cardInteractive: {
    cursor: 'pointer',
  },
  cardSelected: {
    borderColor: 'var(--color-primary)',
    boxShadow: '0 18px 35px rgba(14, 165, 233, 0.35)',
  },
  levelBadge: {
    alignSelf: 'flex-start',
    padding: '6px 12px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '0.95em',
    background: 'rgba(15, 118, 110, 0.25)',
    border: '1px solid rgba(45, 212, 191, 0.4)',
  },
  sessionCount: {
    fontSize: '1.1em',
    fontWeight: 600,
  },
  sessionMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.9em',
    opacity: 0.85,
    gap: '6px',
  },
  sessionCountLabel: {
    fontWeight: 600,
  },
  sessionPercentLabel: {
    fontVariantNumeric: 'tabular-nums',
    fontSize: '0.85em',
    opacity: 0.9,
  },
  sessionBarTrack: {
    width: '100%',
    height: '8px',
    borderRadius: '999px',
    background: 'rgba(148, 163, 184, 0.18)',
    overflow: 'hidden',
  },
  sessionBarFill: {
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.95), rgba(59, 130, 246, 0.75))',
    transition: 'width 0.3s ease',
  },
  topActivity: {
    fontSize: '0.9em',
    opacity: 0.8,
  },
  masteryHighlight: {
    fontSize: '0.8em',
    opacity: 0.75,
    marginTop: '4px',
  },
};

export default LevelProgressPreview;


