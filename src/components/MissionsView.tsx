import React from 'react';
import { MissionProgress, SeasonalEventProgress } from '../types';

interface Props {
  missions: MissionProgress[];
  seasonalEvents: SeasonalEventProgress[];
  onRefresh: () => void;
  onRefreshSeasonal: () => void;
}

const MissionsView: React.FC<Props> = ({ missions, seasonalEvents, onRefresh, onRefreshSeasonal }) => {
  const activeMissions = missions.filter(mission => mission.status === 'active');
  const completedMissions = missions.filter(mission => mission.status === 'completed');

  const formatProgress = (mission: MissionProgress) => {
    if (!mission.objectives.length) {
      return '0% voltooid';
    }
    const objective = mission.objectives[0];
    const progress = Math.min(1, objective.progress / Math.max(1, objective.target));
    return `${Math.round(progress * 100)}% voltooid`;
  };

  const formatExpiration = (mission: MissionProgress) => {
    if (!mission.expiresAt) {
      return 'Zonder verloopdatum';
    }
    const expires = new Date(mission.expiresAt);
    return `Loopt af op ${expires.toLocaleString()}`;
  };

  const renderMissionCard = (mission: MissionProgress) => {
    const objective = mission.objectives[0];
    const progress = Math.min(1, objective.progress / Math.max(1, objective.target));
    const rewardXp = mission.reward?.xp ?? 0;
    return (
      <div key={mission.id} style={styles.missionCard}>
        <div style={styles.missionHeader}>
          <h3 style={styles.missionTitle}>{mission.title}</h3>
          <span style={styles.missionBadge}>{formatProgress(mission)}</span>
        </div>
        <p style={styles.missionDescription}>{mission.description}</p>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div style={styles.missionMeta}>
          <span>Doel: {objective.target} sessie(s)</span>
          <span>Beloning: {rewardXp} XP</span>
        </div>
        <span style={styles.expiration}>{formatExpiration(mission)}</span>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Dagelijkse missies</h2>
          <p style={styles.subtitle}>
            Maak je doelen concreet: voltooi missies voor extra XP en variatie in je oefening.
          </p>
        </div>
        <div style={styles.headerActions}>
          <button type="button" style={styles.refreshButton} onClick={onRefresh}>
            Vernieuw missies
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onRefreshSeasonal}>
            Vernieuw events
          </button>
        </div>
      </div>
      <div style={styles.section}>
        {activeMissions.length ? (
          <>
            <h3 style={styles.sectionTitle}>Actief</h3>
            <div style={styles.missionGrid}>{activeMissions.map(renderMissionCard)}</div>
          </>
        ) : (
          <p style={styles.emptyState}>Momenteel geen actieve missies. Vernieuw om nieuwe uitdagingen te ontvangen.</p>
        )}
      </div>
      {completedMissions.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Voltooid</h3>
          <div style={styles.completedList}>
            {completedMissions.map(mission => (
              <div key={mission.id} style={styles.completedItem}>
                <span>{mission.title}</span>
                <span style={styles.completedReward}>+{mission.reward?.xp ?? 0} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Seizoensevents</h3>
        {seasonalEvents.length > 0 ? (
          <div style={styles.eventGrid}>
            {seasonalEvents.map(event => {
            const isActive = event.status === 'active';
            const progress = Math.min(1, (event.progress ?? 0) / Math.max(1, Number(event.metadata?.targetSessions ?? 5)));
            return (
              <div
                key={event.id}
                style={{
                  ...styles.eventCard,
                  ...(isActive ? styles.eventActive : {}),
                }}
              >
                <div style={styles.eventHeader}>
                  <h3 style={styles.eventTitle}>{event.name}</h3>
                  <span style={{ ...styles.eventStatus, ...(isActive ? styles.eventStatusActive : {}) }}>
                    {event.status === 'upcoming' ? 'Binnenkort' : event.status === 'completed' ? 'Afgerond' : 'Actief'}
                  </span>
                </div>
                <p style={styles.eventDescription}>{event.description}</p>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: `${Math.round(progress * 100)}%` }} />
                </div>
                <div style={styles.eventMeta}>
                  <span>Periode: {new Date(event.startsAt).toLocaleDateString()} - {new Date(event.endsAt).toLocaleDateString()}</span>
                  {event.rewards?.xp ? <span>Beloning: {event.rewards.xp} XP</span> : null}
                </div>
              </div>
            );
            })}
          </div>
        ) : (
          <p style={styles.subtitle}>Geen seizoensevents gevonden. Vernieuw om nieuwe uitdagingen te laden.</p>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
  },
  subtitle: {
    margin: '6px 0 0',
    opacity: 0.75,
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  refreshButton: {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-primary-text)',
    border: 'none',
    borderRadius: '999px',
    padding: '10px 18px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    color: 'var(--color-text)',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    borderRadius: '999px',
    padding: '10px 18px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1em',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-primary)',
  },
  missionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
  },
  missionCard: {
    borderRadius: '16px',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    backgroundColor: 'var(--color-secondary-bg)',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '0 16px 32px rgba(15, 23, 42, 0.25)',
  },
  missionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  missionTitle: {
    margin: 0,
    fontSize: '1.05em',
  },
  missionBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: 'rgba(59, 130, 246, 1)',
    borderRadius: '999px',
    padding: '4px 10px',
    fontSize: '0.8em',
    fontWeight: 600,
  },
  missionDescription: {
    margin: 0,
    fontSize: '0.9em',
    opacity: 0.85,
  },
  progressTrack: {
    height: '8px',
    borderRadius: '999px',
    backgroundColor: 'rgba(148, 163, 184, 0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, var(--color-primary), rgba(14, 165, 233, 0.85))',
    transition: 'width 0.3s ease',
  },
  missionMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85em',
    opacity: 0.8,
  },
  expiration: {
    fontSize: '0.75em',
    opacity: 0.7,
  },
  emptyState: {
    opacity: 0.75,
  },
  completedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  completedItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: '12px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.35)',
    fontSize: '0.9em',
  },
  completedReward: {
    fontWeight: 600,
  },
  eventGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  eventCard: {
    borderRadius: '16px',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: 'var(--color-secondary-bg)',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.2)',
  },
  eventActive: {
    borderColor: 'rgba(59, 130, 246, 0.6)',
    boxShadow: '0 16px 32px rgba(59, 130, 246, 0.25)',
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    alignItems: 'baseline',
  },
  eventTitle: {
    margin: 0,
    fontSize: '1.05em',
  },
  eventStatus: {
    fontSize: '0.75em',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  eventStatusActive: {
    color: 'rgba(59, 130, 246, 1)',
  },
  eventDescription: {
    margin: 0,
    fontSize: '0.9em',
    opacity: 0.85,
  },
  eventMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '0.8em',
    opacity: 0.75,
  },
};

export default MissionsView;

