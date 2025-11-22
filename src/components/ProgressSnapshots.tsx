import React from 'react';
import { ProgressData } from '../types';

interface Props {
  current: ProgressData;
  previous: ProgressData | null;
  levelTotals: Array<{ level: string; total: number }>;
}

const countSessions = (progress: ProgressData | null): number => {
  if (!progress?.stats) {
    return 0;
  }
  return Object.values(progress.stats).reduce((levelSum, levelStats) => {
    const value = Object.values(levelStats ?? {}).reduce((sum, entry) => sum + (entry ?? 0), 0);
    return levelSum + value;
  }, 0);
};

const ProgressSnapshots: React.FC<Props> = ({ current, previous, levelTotals }) => {
  const totalSessionsNow = countSessions(current);
  const totalSessionsPrev = countSessions(previous);
  const sessionDelta = totalSessionsNow - totalSessionsPrev;

  const streakNow = current.currentStreak ?? 0;
  const streakPrev = previous?.currentStreak ?? 0;
  const streakDelta = streakNow - streakPrev;

  const busiestLevel = [...levelTotals].sort((a, b) => b.total - a.total)[0];

  const renderDelta = (value: number) => {
    if (value === 0) return <span style={styles.deltaNeutral}>geen verandering</span>;
    if (value > 0) return <span style={styles.deltaPositive}>+{value}</span>;
    return <span style={styles.deltaNegative}>{value}</span>;
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>Totaal afgeronde sessies</span>
          {renderDelta(sessionDelta)}
        </div>
        <span style={styles.cardValue}>{totalSessionsNow}</span>
        <span style={styles.cardMeta}>Sinds start · {totalSessionsPrev} vorige snapshot</span>
      </div>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>Actuele streak</span>
          {renderDelta(streakDelta)}
        </div>
        <span style={styles.cardValue}>{streakNow} dagen</span>
        <span style={styles.cardMeta}>Langste reeks: {current.longestStreak ?? 0} dagen</span>
      </div>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>Focus niveau</span>
          {busiestLevel ? (
            <span style={styles.focusBadge}>{busiestLevel.level}</span>
          ) : (
            <span style={styles.focusBadge}>n.v.t.</span>
          )}
        </div>
        <span style={styles.cardValue}>{busiestLevel ? `${busiestLevel.total} sessies` : 'Nog geen data'}</span>
        <span style={styles.cardMeta}>
          Meeste oefening op niveau {busiestLevel?.level ?? 'onbekend'}
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  },
  card: {
    padding: '18px',
    borderRadius: '16px',
    backgroundColor: 'var(--color-secondary)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxShadow: '0 16px 32px rgba(15, 23, 42, 0.25)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '8px',
  },
  cardTitle: {
    fontSize: '0.85em',
    opacity: 0.75,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  cardValue: {
    fontSize: '1.6em',
    fontWeight: 700,
  },
  cardMeta: {
    fontSize: '0.85em',
    opacity: 0.75,
  },
  deltaPositive: {
    color: 'rgba(34, 197, 94, 1)',
    fontWeight: 600,
  },
  deltaNegative: {
    color: 'rgba(248, 113, 113, 1)',
    fontWeight: 600,
  },
  deltaNeutral: {
    opacity: 0.65,
  },
  focusBadge: {
    padding: '4px 10px',
    borderRadius: '999px',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: 'rgba(59, 130, 246, 1)',
    fontSize: '0.75em',
    fontWeight: 600,
  },
};

export default ProgressSnapshots;

