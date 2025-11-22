import React, { useState, useEffect } from 'react';
import type { GamificationState, Badge, Achievement } from '@/types/gamification';
import { loadGamificationState, updateStreak, checkBadges, checkAchievements, addPoints, saveGamificationState } from '@/services/gamification';

interface GamificationDashboardProps {
    onClose?: () => void;
}

export const GamificationDashboard: React.FC<GamificationDashboardProps> = ({ onClose }) => {
    const [state, setState] = useState<GamificationState>(loadGamificationState());
    const [newBadges, setNewBadges] = useState<Badge[]>([]);
    const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

    useEffect(() => {
        // Update streak
        const updatedState = updateStreak(state);
        setState(updatedState);
        saveGamificationState(updatedState);

        // Check voor nieuwe badges en achievements
        const badgeResult = checkBadges(updatedState);
        const achievementResult = checkAchievements(badgeResult.state, 0, 0); // TODO: Get actual counts
        setState(achievementResult.state);
        setNewBadges(badgeResult.newBadges);
        setNewAchievements(achievementResult.newAchievements);
        saveGamificationState(achievementResult.state);
    }, []);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Gamificatie Dashboard</h2>
                {onClose && (
                    <button type="button" onClick={onClose} style={styles.closeButton}>
                        ×
                    </button>
                )}
            </div>

            <div style={styles.stats}>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{state.level}</div>
                    <div style={styles.statLabel}>Level</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{state.totalPoints}</div>
                    <div style={styles.statLabel}>Punten</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{state.streak.currentStreak}</div>
                    <div style={styles.statLabel}>Dagen Streak</div>
                </div>
            </div>

            {state.streak.currentStreak > 0 && (
                <div style={styles.streakCard}>
                    <div style={styles.streakIcon}>🔥</div>
                    <div>
                        <div style={styles.streakText}>
                            {state.streak.currentStreak} dagen op rij!
                        </div>
                        <div style={styles.streakSubtext}>
                            Langste streak: {state.streak.longestStreak} dagen
                        </div>
                    </div>
                </div>
            )}

            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Badges ({state.badges.length})</h3>
                <div style={styles.badgesGrid}>
                    {state.badges.map(badge => (
                        <div key={badge.id} style={styles.badge}>
                            <div style={styles.badgeIcon}>{badge.icon}</div>
                            <div style={styles.badgeName}>{badge.name}</div>
                            <div style={styles.badgeDescription}>{badge.description}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Achievements ({state.achievements.length})</h3>
                <div style={styles.achievementsList}>
                    {state.achievements.map(achievement => (
                        <div key={achievement.id} style={styles.achievement}>
                            <div style={styles.achievementName}>{achievement.name}</div>
                            <div style={styles.achievementDescription}>{achievement.description}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px',
        maxWidth: '800px',
        margin: '0 auto',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        margin: 0,
        fontSize: '1.5rem',
        fontWeight: 700,
    },
    closeButton: {
        background: 'transparent',
        border: 'none',
        fontSize: '2rem',
        cursor: 'pointer',
        color: 'var(--color-text)',
        lineHeight: 1,
    },
    stats: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
    },
    statCard: {
        padding: '20px',
        borderRadius: '12px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        textAlign: 'center',
    },
    statValue: {
        fontSize: '2rem',
        fontWeight: 700,
        color: 'var(--color-primary)',
    },
    statLabel: {
        fontSize: '0.9rem',
        opacity: 0.7,
        marginTop: '4px',
    },
    streakCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        border: '1px solid rgba(251, 146, 60, 0.3)',
    },
    streakIcon: {
        fontSize: '2.5rem',
    },
    streakText: {
        fontSize: '1.2rem',
        fontWeight: 600,
    },
    streakSubtext: {
        fontSize: '0.9rem',
        opacity: 0.7,
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    sectionTitle: {
        margin: 0,
        fontSize: '1.2rem',
        fontWeight: 600,
    },
    badgesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '16px',
    },
    badge: {
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        textAlign: 'center',
    },
    badgeIcon: {
        fontSize: '2.5rem',
        marginBottom: '8px',
    },
    badgeName: {
        fontSize: '0.95rem',
        fontWeight: 600,
        marginBottom: '4px',
    },
    badgeDescription: {
        fontSize: '0.8rem',
        opacity: 0.7,
    },
    achievementsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    achievement: {
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    achievementName: {
        fontSize: '1rem',
        fontWeight: 600,
        marginBottom: '4px',
    },
    achievementDescription: {
        fontSize: '0.9rem',
        opacity: 0.7,
    },
};

