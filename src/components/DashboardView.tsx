

import React from 'react';
import {
  ProgressData,
  CEFR_LEVELS,
  ACTIVITY_MODES,
  ACTIVITY_MODE_TRANSLATIONS,
  SavedConversation,
  StreakState,
  BadgeProgress,
} from '../types';
import { STREAK_MILESTONES } from '../utils/gamificationUtils';
import { formatTimeUntil } from '../utils/notificationUtils';
import ProgressSnapshots from './ProgressSnapshots';

interface Props {
  progress: ProgressData;
  history: SavedConversation[];
  streaks: StreakState;
  badges: BadgeProgress[];
  previousProgress?: ProgressData | null;
}

const DashboardView: React.FC<Props> = ({ progress, history, streaks, badges, previousProgress }) => {
  const [isCompact, setIsCompact] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const query = window.matchMedia('(max-width: 720px)');
    const handleChange = (event: MediaQueryListEvent) => setIsCompact(event.matches);

    setIsCompact(query.matches);
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', handleChange);
      return () => query.removeEventListener('change', handleChange);
    }

    // Fallback voor oudere browsers
    if (typeof query.addListener === 'function') {
      query.addListener(handleChange);
      return () => query.removeListener(handleChange);
    }
  }, []);

  const sessionsWithMetrics = history.filter(
    (conversation) => conversation.metrics && conversation.metrics.totalDurationMs > 0,
  );
  const totalSessions = sessionsWithMetrics.length;
  const averageUserShare = totalSessions > 0
    ? sessionsWithMetrics.reduce((acc, conversation) => acc + (conversation.metrics?.userTalkShare ?? 0), 0) / totalSessions
    : 0;
  const averageDurationMs = totalSessions > 0
    ? sessionsWithMetrics.reduce((acc, conversation) => acc + (conversation.metrics?.totalDurationMs ?? 0), 0) / totalSessions
    : 0;
  const balancedSessions = totalSessions > 0
    ? sessionsWithMetrics.filter((conversation) => {
        const share = conversation.metrics?.userTalkShare ?? 0;
        return share >= 0.45 && share <= 0.65;
      }).length
    : 0;
  const newsSessions = history.filter(conversation => Boolean(conversation.news)).length;
  const latestNewsSession = history.find(conversation => conversation.news)?.news ?? null;

  const timelineDays = 14;
  const today = new Date();

  const timelineData = Array.from({ length: timelineDays }, (_, index) => {
    const day = new Date(today);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (timelineDays - 1 - index));
    const isoKey = day.toISOString().split('T')[0];
    const sessionsForDay = history.filter(conversation => {
      const dateSource = conversation.id ?? conversation.date;
      const convoDate = new Date(dateSource);
      if (Number.isNaN(convoDate.getTime())) {
        return false;
      }
      const normalized = convoDate.toISOString().split('T')[0];
      return normalized === isoKey;
    });
    const totalMinutes = sessionsForDay.reduce((minutes, conversation) => {
      const durationMs = conversation.metrics?.totalDurationMs ?? 0;
      return minutes + Math.round(durationMs / 60000);
    }, 0);
    return {
      key: isoKey,
      label: day.toLocaleDateString('nl-NL', { weekday: 'short' }),
      count: sessionsForDay.length,
      minutes: totalMinutes,
    };
  });

  const maxSessionsPerDay = timelineData.reduce((max, day) => Math.max(max, day.count), 0) || 1;
  const activityCounts = history.reduce<Record<string, number>>((acc, conversation) => {
    acc[conversation.activity] = (acc[conversation.activity] ?? 0) + 1;
    return acc;
  }, {});
  const totalActivitySessions = Object.values(activityCounts).reduce((sum, value) => sum + value, 0);

  const levelTotals = CEFR_LEVELS.map(level => {
    const levelStats = progress.stats?.[level] ?? {};
    const total = Object.values(levelStats ?? {}).reduce((sum, value) => sum + (value ?? 0), 0);
    return { level, total };
  });

  const dailyStats = streaks.daily;
  const weeklyStats = streaks.weekly;

  const parseDateOnly = (value?: string): Date | null => {
    if (!value) {
      return null;
    }
    const parts = value.split('-').map(Number);
    if (parts.length !== 3) {
      return null;
    }
    const [year, month, day] = parts;
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  };

  const formatDate = (value?: string) => {
    const date = parseDateOnly(value);
    return date ? date.toLocaleDateString() : '—';
  };

  const dailyDeadlineDate = (() => {
    const last = parseDateOnly(dailyStats.lastCompletedDate);
    if (!last) {
      return null;
    }
    const deadline = new Date(last);
    deadline.setDate(deadline.getDate() + 1);
    return deadline;
  })();

  const weeklyDeadlineDate = (() => {
    const last = parseDateOnly(weeklyStats.lastCompletedDate);
    if (!last) {
      return null;
    }
    const deadline = new Date(last);
    deadline.setDate(deadline.getDate() + 7);
    return deadline;
  })();

  const dailyCountdownLabel = dailyDeadlineDate ? formatTimeUntil(dailyDeadlineDate.toISOString()) : null;
  const weeklyCountdownLabel = weeklyDeadlineDate ? formatTimeUntil(weeklyDeadlineDate.toISOString()) : null;

  const hasDailyStreak = dailyStats.current > 0;
  const hasWeeklyStreak = weeklyStats.current > 0;

  const dailyCountdownText = hasDailyStreak && dailyCountdownLabel
    ? dailyCountdownLabel === 'nu'
      ? 'Verloopt nu'
      : `Nog ${dailyCountdownLabel}`
    : 'Begin vandaag een sessie om je streak op te bouwen.';

  const weeklyCountdownText = hasWeeklyStreak && weeklyCountdownLabel
    ? weeklyCountdownLabel === 'nu'
      ? 'Nieuwe week begint nu'
      : `Nog ${weeklyCountdownLabel}`
    : 'Plan deze week een sessie voor je wekelijkse streak.';

  const unlockedMilestones = new Set(progress.streakMilestonesUnlocked ?? []);
  const milestoneBadges = STREAK_MILESTONES.map((value) => ({
    value,
    unlocked: unlockedMilestones.has(value),
  }));
  const nextMilestone = STREAK_MILESTONES.find((value) => !unlockedMilestones.has(value));
  const daysRemainingForNextMilestone = nextMilestone != null
    ? Math.max(nextMilestone - dailyStats.current, 0)
    : null;
  const nextMilestoneText = nextMilestone != null
    ? daysRemainingForNextMilestone === 0
      ? `Bonus behaald bij ${nextMilestone} dagen!`
      : `Nog ${daysRemainingForNextMilestone} dag(en) tot ${nextMilestone} dagen.`
    : 'Alle dagelijkse mijlpalen gehaald!';
  const unlockedBadges = badges.filter((badge) => Boolean(badge.unlockedAt));
  const lockedBadges = badges.filter((badge) => !badge.unlockedAt);

  const formatDuration = (ms: number) => {
    if (!ms || ms <= 0) {
      return '0:00';
    }
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderLevelDistribution = () => {
    if (isCompact) {
      return (
        <section style={{ ...styles.metricsSection, ...styles.mobileLevelSection, ...(isCompact ? styles.compactSection : {}) }}>
          <h3 style={styles.metricsTitle}>Sessies per niveau</h3>
          <div style={styles.mobileLevelList}>
            {CEFR_LEVELS.map(level => {
              const levelStat = levelTotals.find(item => item.level === level);
              const totalForLevel = levelStat?.total ?? 0;
              return (
                <div key={level} style={styles.mobileLevelCard}>
                  <div style={styles.mobileLevelHeader}>
                    <span style={styles.mobileLevelTitle}>{level}</span>
                    <span style={styles.mobileLevelTotal}>{totalForLevel} sessies</span>
                  </div>
                  <div style={styles.mobileActivityList}>
                    {ACTIVITY_MODES.map(mode => (
                      <div key={`${level}-${mode}`} style={styles.mobileActivityRow}>
                        <span style={styles.mobileActivityLabel}>{ACTIVITY_MODE_TRANSLATIONS[mode]}</span>
                        <span style={styles.mobileActivityCount}>{progress.stats?.[level]?.[mode] ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    return (
      <section style={{ ...styles.metricsSection, ...(isCompact ? styles.compactSection : {}) }}>
        <h3 style={styles.metricsTitle}>Sessies per niveau</h3>
        <div style={styles.gridWrapper}>
          <div style={styles.gridContainer}>
            <div style={styles.headerCell}></div>
            {ACTIVITY_MODES.map(mode => (
              <div key={mode} style={styles.headerCell}>{ACTIVITY_MODE_TRANSLATIONS[mode]}</div>
            ))}

            {CEFR_LEVELS.map(level => (
              <React.Fragment key={level}>
                <div style={styles.headerCell}>{level}</div>
                {ACTIVITY_MODES.map(mode => (
                  <div
                    key={`${level}-${mode}`}
                    style={styles.cell}
                  >
                    {progress.stats?.[level]?.[mode] || 0}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div style={{ ...styles.pageContainer, ...(isCompact ? styles.pageContainerCompact : {}) }}>
      <h2 style={{textAlign: 'center'}}>Jouw Voortgang</h2>
      <p style={{textAlign: 'center', marginBottom: '20px'}}>Dit rooster toont het aantal sessies dat je hebt voltooid voor elk niveau en type activiteit.</p>
      <section style={{ ...styles.streakSection, ...(isCompact ? styles.compactSection : {}) }}>
        <h3 style={styles.metricsTitle}>Streaks &amp; bonussen</h3>
        <div style={{ ...styles.metricCards, ...(isCompact ? styles.metricCardsCompact : {}) }}>
          <div style={{ ...styles.metricCard, ...(isCompact ? styles.metricCardCompact : {}) }}>
            <span style={styles.metricLabel}>Dagelijkse streak</span>
            <span style={{ ...styles.metricValue, ...(isCompact ? styles.metricValueCompact : {}) }}>{dailyStats.current} dagen</span>
            <span style={{ ...styles.streakMeta, ...(isCompact ? styles.streakMetaCompact : {}) }}>Langste reeks: {dailyStats.longest}</span>
            <span style={{ ...styles.streakMeta, ...(isCompact ? styles.streakMetaCompact : {}) }}>{dailyCountdownText}</span>
            <span style={{ ...styles.streakMeta, ...(isCompact ? styles.streakMetaCompact : {}) }}>Laatste sessie: {formatDate(progress.lastSessionDate)}</span>
          </div>
          <div style={{ ...styles.metricCard, ...(isCompact ? styles.metricCardCompact : {}) }}>
            <span style={styles.metricLabel}>Wekelijkse streak</span>
            <span style={{ ...styles.metricValue, ...(isCompact ? styles.metricValueCompact : {}) }}>{weeklyStats.current} weken</span>
            <span style={{ ...styles.streakMeta, ...(isCompact ? styles.streakMetaCompact : {}) }}>Langste reeks: {weeklyStats.longest}</span>
            <span style={{ ...styles.streakMeta, ...(isCompact ? styles.streakMetaCompact : {}) }}>{weeklyCountdownText}</span>
            <span style={{ ...styles.streakMeta, ...(isCompact ? styles.streakMetaCompact : {}) }}>Laatste actieve week: {formatDate(progress.lastWeeklySessionDate)}</span>
          </div>
          <div style={{ ...styles.metricCard, ...(isCompact ? styles.metricCardCompact : {}) }}>
            <span style={styles.metricLabel}>Dagelijkse mijlpalen</span>
            <div style={{ ...styles.milestoneRow, ...(isCompact ? styles.milestoneRowCompact : {}) }}>
              {milestoneBadges.map(({ value, unlocked }) => (
                <span
                  key={value}
                  style={{
                    ...styles.milestonePill,
                    ...(unlocked ? styles.milestoneUnlocked : styles.milestoneLocked),
                    ...(isCompact ? styles.milestonePillCompact : {}),
                  }}
                >
                  {value}d
                </span>
              ))}
            </div>
            <span style={{ ...styles.streakMeta, ...(isCompact ? styles.streakMetaCompact : {}) }}>{nextMilestoneText}</span>
          </div>
        </div>
      </section>
      <section style={{ ...styles.heatmapSection, ...(isCompact ? styles.compactSection : {}) }}>
        <h3 style={styles.metricsTitle}>Sessieritme (laatste 14 dagen)</h3>
        <div style={styles.heatmapRow}>
          {timelineData.map((day) => {
            const intensity = maxSessionsPerDay > 0 ? day.count / maxSessionsPerDay : 0;
            const backgroundAlpha = Math.min(0.15 + intensity * 0.75, 0.9);
            return (
              <div key={day.key} style={styles.heatmapCell}>
                <span style={styles.heatmapLabel}>{day.label}</span>
                <div
                  style={{
                    ...styles.heatmapSquare,
                    backgroundColor: `rgba(59, 130, 246, ${backgroundAlpha})`,
                    borderColor: intensity > 0 ? 'rgba(59, 130, 246, 0.55)' : 'rgba(148, 163, 184, 0.35)',
                  }}
                  title={`${day.count} sessies · ${day.minutes} minuten`}
                >
                  <span style={styles.heatmapValue}>{day.count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {renderLevelDistribution()}
      <section style={{ ...styles.metricsSection, ...(isCompact ? styles.compactSection : {}) }}>
        <h3 style={styles.metricsTitle}>Gespreksdynamiek</h3>
        {totalSessions > 0 ? (
          <div style={{ ...styles.metricCards, ...(isCompact ? styles.metricCardsCompact : {}) }}>
            <div style={{ ...styles.metricCard, ...(isCompact ? styles.metricCardCompact : {}) }}>
              <span style={styles.metricLabel}>Gemiddelde spreektijd leerling</span>
              <span style={{ ...styles.metricValue, ...(isCompact ? styles.metricValueCompact : {}) }}>{Math.round(averageUserShare * 100)}%</span>
            </div>
            <div style={{ ...styles.metricCard, ...(isCompact ? styles.metricCardCompact : {}) }}>
              <span style={styles.metricLabel}>Gemiddelde sessieduur</span>
              <span style={{ ...styles.metricValue, ...(isCompact ? styles.metricValueCompact : {}) }}>{formatDuration(averageDurationMs)}</span>
            </div>
            <div style={{ ...styles.metricCard, ...(isCompact ? styles.metricCardCompact : {}) }}>
              <span style={styles.metricLabel}>Balans (45%-65%)</span>
              <span style={{ ...styles.metricValue, ...(isCompact ? styles.metricValueCompact : {}) }}>
                {balancedSessions}/{totalSessions}
              </span>
            </div>
            <div style={{ ...styles.metricCard, ...(isCompact ? styles.metricCardCompact : {}) }}>
              <span style={styles.metricLabel}>Nieuws-sessies</span>
              <span style={{ ...styles.metricValue, ...(isCompact ? styles.metricValueCompact : {}) }}>
                {newsSessions}/{history.length}
              </span>
              {latestNewsSession && (
                <span style={styles.metricSubtle}>
                  Laatste: {latestNewsSession.source}
                  {latestNewsSession.publishedAt
                    ? ` · ${new Date(latestNewsSession.publishedAt).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}`
                    : ''}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p style={{ ...styles.metricPlaceholder, ...(isCompact ? styles.metricPlaceholderCompact : {}) }}>
            Nog geen gegevens over spreektijd verzameld. Start een sessie om statistieken te zien.
          </p>
        )}
      </section>
      <section style={{ ...styles.activitySection, ...(isCompact ? styles.compactSection : {}) }}>
        <h3 style={styles.metricsTitle}>Activiteitenmix</h3>
        {totalActivitySessions > 0 ? (
          <ul style={styles.activityList}>
            {Object.entries(activityCounts)
              .sort(([, a], [, b]) => Number(b) - Number(a))
              .map(([activity, count]) => {
                const share = Math.round((count / totalActivitySessions) * 100);
                return (
                  <li key={activity} style={styles.activityItem}>
                    <span>{ACTIVITY_MODE_TRANSLATIONS[activity as keyof typeof ACTIVITY_MODE_TRANSLATIONS] ?? activity}</span>
                    <span style={styles.activityMeta}>{count} sessies · {share}%</span>
                    <div style={styles.activityTrack}>
                      <div style={{ ...styles.activityFill, width: `${share}%` }} />
                    </div>
                  </li>
                );
              })}
          </ul>
        ) : (
          <p style={{ ...styles.metricPlaceholder, ...(isCompact ? styles.metricPlaceholderCompact : {}) }}>
            Nog geen activiteiten gevonden. Start je eerste sessie om deze grafiek te vullen.
          </p>
        )}
      </section>
      <section style={{ ...styles.badgeSection, ...(isCompact ? styles.compactSection : {}) }}>
        <h3 style={styles.metricsTitle}>Badges</h3>
        <p style={styles.badgeSubtitle}>
          Verzamel badges door streaks te verlengen, nieuwe levels te behalen en missies te voltooien.
        </p>
        <div style={styles.badgeGrid}>
          {[...unlockedBadges, ...lockedBadges].map(badge => {
            const unlocked = Boolean(badge.unlockedAt);
            return (
              <div
                key={badge.id}
                style={{
                  ...styles.badgeCard,
                  ...(unlocked ? styles.badgeUnlocked : styles.badgeLocked),
                }}
              >
                <div style={styles.badgeHeaderRow}>
                  <span style={styles.badgeName}>{badge.name}</span>
                  <span style={styles.badgeStatus}>{unlocked ? 'Ontgrendeld' : 'Slot'}</span>
                </div>
                <p style={styles.badgeDescription}>{badge.description}</p>
                {!unlocked && badge.hint && <span style={styles.badgeHint}>{badge.hint}</span>}
                {unlocked && badge.unlockedAt && (
                  <span style={styles.badgeMeta}>Sinds {new Date(badge.unlockedAt).toLocaleDateString()}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <section style={{ ...styles.snapshotsSection, ...(isCompact ? styles.compactSection : {}) }}>
        <h3 style={styles.metricsTitle}>Progress snapshots</h3>
        <ProgressSnapshots current={progress} previous={previousProgress ?? null} levelTotals={levelTotals} />
      </section>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: {
    padding: '0 24px 32px',
  },
  pageContainerCompact: {
    padding: '0 16px 24px',
  },
  compactSection: {
    padding: '16px',
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.2)',
  },
  streakSection: {
    marginBottom: '30px',
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-secondary-bg)',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.25)',
  },
  gridWrapper: {
    width: '100%',
    overflowX: 'auto',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: `auto repeat(${ACTIVITY_MODES.length}, 1fr)`,
    gap: '5px',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '5px',
    backgroundColor: 'var(--color-secondary-bg)',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
  },
  headerCell: {
    fontWeight: 'bold',
    padding: '10px',
    textAlign: 'center',
  },
  cell: {
    padding: '15px 10px',
    textAlign: 'center',
    backgroundColor: 'var(--color-secondary)',
    borderRadius: '5px',
  },
  metricsSection: {
    marginTop: '30px',
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-secondary-bg)',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.25)',
  },
  metricsTitle: {
    margin: '0 0 16px 0',
    textAlign: 'center',
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  metricCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  metricCardsCompact: {
    gridTemplateColumns: '1fr',
    gap: '12px',
  },
  metricCard: {
    padding: '16px',
    borderRadius: '10px',
    backgroundColor: 'var(--color-secondary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'flex-start',
  },
  metricCardCompact: {
    gap: '4px',
  },
  metricLabel: {
    fontSize: '0.85em',
    opacity: 0.75,
  },
  metricValue: {
    fontSize: '1.5em',
    fontWeight: 700,
  },
  metricValueCompact: {
    fontSize: '1.3em',
  },
  metricSubtle: {
    fontSize: '0.8em',
    opacity: 0.7,
  },
  streakMeta: {
    fontSize: '0.8em',
    opacity: 0.75,
  },
  streakMetaCompact: {
    fontSize: '0.75em',
  },
  milestoneRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '6px',
    marginBottom: '6px',
  },
  milestoneRowCompact: {
    gap: '6px',
  },
  milestonePill: {
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '0.8em',
    border: '1px solid var(--color-border)',
    transition: 'all 0.2s ease',
  },
  milestonePillCompact: {
    padding: '4px 8px',
  },
  milestoneUnlocked: {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-primary-text)',
    borderColor: 'var(--color-primary)',
  },
  milestoneLocked: {
    backgroundColor: 'transparent',
    color: 'var(--color-text)',
    borderColor: 'var(--color-border)',
    opacity: 0.7,
  },
  mobileLevelSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  mobileLevelList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  mobileLevelCard: {
    borderRadius: '14px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '0 14px 32px rgba(15, 23, 42, 0.35)',
  },
  mobileLevelHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '12px',
  },
  mobileLevelTitle: {
    fontSize: '1.1em',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  mobileLevelTotal: {
    fontSize: '0.85em',
    opacity: 0.75,
  },
  mobileActivityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  mobileActivityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    borderRadius: '10px',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    border: '1px solid rgba(148, 163, 184, 0.16)',
  },
  mobileActivityLabel: {
    fontSize: '0.9em',
  },
  mobileActivityCount: {
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  metricPlaceholder: {
    textAlign: 'center',
    opacity: 0.7,
    margin: 0,
  },
  metricPlaceholderCompact: {
    fontSize: '0.9em',
  },
  badgeSection: {
    marginTop: '30px',
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-secondary-bg)',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  badgeSubtitle: {
    margin: 0,
    opacity: 0.75,
  },
  badgeGrid: {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  },
  badgeCard: {
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  badgeUnlocked: {
    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(45, 212, 191, 0.15))',
    boxShadow: '0 16px 32px rgba(34, 197, 94, 0.25)',
  },
  badgeLocked: {
    background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.12), rgba(148, 163, 184, 0.05))',
    opacity: 0.85,
  },
  badgeHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  badgeName: {
    fontWeight: 600,
  },
  badgeStatus: {
    fontSize: '0.75em',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  badgeDescription: {
    margin: 0,
    fontSize: '0.9em',
  },
  badgeHint: {
    fontSize: '0.75em',
    opacity: 0.75,
  },
  badgeMeta: {
    fontSize: '0.75em',
    opacity: 0.75,
  },
  heatmapSection: {
    marginTop: '20px',
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-secondary-bg)',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.25)',
  },
  heatmapRow: {
    display: 'grid',
    gap: '10px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(48px, 1fr))',
    alignItems: 'end',
  },
  heatmapCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  heatmapLabel: {
    fontSize: '0.75em',
    opacity: 0.65,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  heatmapSquare: {
    width: '100%',
    paddingTop: '100%',
    borderRadius: '12px',
    position: 'relative',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapValue: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontWeight: 600,
    fontSize: '0.9em',
  },
  activitySection: {
    marginTop: '30px',
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-secondary-bg)',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.25)',
  },
  activityList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  activityItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  activityMeta: {
    fontSize: '0.85em',
    opacity: 0.75,
  },
  activityTrack: {
    height: '8px',
    borderRadius: '999px',
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    overflow: 'hidden',
  },
  activityFill: {
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.75), rgba(59, 130, 246, 1))',
  },
  snapshotsSection: {
    marginTop: '30px',
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-secondary-bg)',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.25)',
  },
};

export default DashboardView;