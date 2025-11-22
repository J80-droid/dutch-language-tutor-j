import React, { useState, useEffect } from 'react';
import type { UserProfile } from '@/types/userProfile';
import { loadUserProfile, saveUserProfile } from '@/services/userProfile';
import { DEFAULT_USER_PROFILE } from '@/types/userProfile';

export const UserProfileView: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const loaded = loadUserProfile();
        setProfile(loaded);
    }, []);

    const handleSavePreferences = () => {
        saveUserProfile(profile);
        setIsEditing(false);
    };

    const formatTime = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}u ${mins}m`;
        }
        return `${mins}m`;
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Gebruikersprofiel</h2>

            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Statistieken</h3>
                <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{profile.statistics.totalExercisesCompleted}</div>
                        <div style={styles.statLabel}>Oefeningen Voltooid</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{formatTime(profile.statistics.totalTimeSpent)}</div>
                        <div style={styles.statLabel}>Totale Tijd</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{Math.round(profile.statistics.averageScore)}%</div>
                        <div style={styles.statLabel}>Gemiddelde Score</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{profile.gamification.level}</div>
                        <div style={styles.statLabel}>Level</div>
                    </div>
                </div>
            </div>

            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Huidig Niveau</h3>
                <div style={styles.levelBadge}>
                    <div style={styles.levelValue}>{profile.currentLevel}</div>
                    {profile.placementTestResult && (
                        <div style={styles.levelSubtext}>
                            Bepaald via instaptoets ({Math.round(profile.placementTestResult.score)}%)
                        </div>
                    )}
                </div>
            </div>

            {profile.weakPoints.length > 0 && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Zwakke Punten</h3>
                    <div style={styles.weakPointsList}>
                        {profile.weakPoints.slice(0, 5).map((weakPoint, index) => (
                            <div key={index} style={styles.weakPointItem}>
                                <span>{weakPoint.topic}</span>
                                <span style={styles.errorRate}>{Math.round(weakPoint.errorRate * 100)}% fout</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Voortgang per Categorie</h3>
                <div style={styles.categoryProgress}>
                    {Object.entries(profile.statistics.exercisesByCategory).map(([category, count]) => (
                        <div key={category} style={styles.categoryItem}>
                            <span style={styles.categoryName}>{category}</span>
                            <span style={styles.categoryCount}>{count} oefeningen</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Voorkeuren</h3>
                {isEditing ? (
                    <div style={styles.preferencesEdit}>
                        <div style={styles.preferenceItem}>
                            <label style={styles.label}>Dagelijks Doel:</label>
                            <input
                                type="number"
                                value={profile.preferences.dailyGoal}
                                onChange={(e) =>
                                    setProfile({
                                        ...profile,
                                        preferences: {
                                            ...profile.preferences,
                                            dailyGoal: parseInt(e.target.value, 10) || 0,
                                        },
                                    })
                                }
                                style={styles.input}
                                min="1"
                                max="50"
                            />
                            <span style={styles.inputLabel}>oefeningen per dag</span>
                        </div>
                        <div style={styles.preferenceItem}>
                            <label style={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={profile.preferences.reminderEnabled}
                                    onChange={(e) =>
                                        setProfile({
                                            ...profile,
                                            preferences: {
                                                ...profile.preferences,
                                                reminderEnabled: e.target.checked,
                                            },
                                        })
                                    }
                                    style={styles.checkbox}
                                />
                                Herinneringen inschakelen
                            </label>
                        </div>
                        <div style={styles.buttonRow}>
                            <button type="button" onClick={handleSavePreferences} style={styles.saveButton}>
                                Opslaan
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                style={styles.cancelButton}
                            >
                                Annuleren
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={styles.preferencesView}>
                        <div style={styles.preferenceItem}>
                            <span style={styles.preferenceLabel}>Dagelijks Doel:</span>
                            <span>{profile.preferences.dailyGoal} oefeningen per dag</span>
                        </div>
                        <div style={styles.preferenceItem}>
                            <span style={styles.preferenceLabel}>Herinneringen:</span>
                            <span>{profile.preferences.reminderEnabled ? 'Ingeschakeld' : 'Uitgeschakeld'}</span>
                        </div>
                        <button type="button" onClick={() => setIsEditing(true)} style={styles.editButton}>
                            Bewerken
                        </button>
                    </div>
                )}
            </div>

            {profile.srsItems.length > 0 && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>SRS Items</h3>
                    <div style={styles.srsInfo}>
                        <span>{profile.srsItems.length} woorden in SRS systeem</span>
                        <span>
                            {profile.srsItems.filter((item) => item.nextReviewDate <= Date.now()).length} items
                            klaar voor review
                        </span>
                    </div>
                </div>
            )}

            {profile.activeLearningPaths.length > 0 && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Actieve Leerpaden</h3>
                    <div style={styles.pathsList}>
                        {profile.activeLearningPaths.map((path) => (
                            <div key={path.id} style={styles.pathItem}>
                                <span style={styles.pathName}>{path.name}</span>
                                <span style={styles.pathProgress}>
                                    {path.steps.filter((s) => s.completed).length} / {path.steps.length} stappen
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        padding: '24px',
        maxWidth: '1000px',
        margin: '0 auto',
    },
    title: {
        margin: 0,
        fontSize: '1.8rem',
        fontWeight: 700,
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
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
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
        marginBottom: '8px',
    },
    statLabel: {
        fontSize: '0.9rem',
        opacity: 0.7,
    },
    levelBadge: {
        padding: '24px',
        borderRadius: '12px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        textAlign: 'center',
    },
    levelValue: {
        fontSize: '3rem',
        fontWeight: 700,
        color: 'var(--color-primary)',
        marginBottom: '8px',
    },
    levelSubtext: {
        fontSize: '0.9rem',
        opacity: 0.7,
    },
    weakPointsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    weakPointItem: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    errorRate: {
        color: 'rgba(248, 113, 113, 1)',
        fontWeight: 600,
    },
    categoryProgress: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    categoryItem: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    categoryName: {
        fontWeight: 600,
    },
    categoryCount: {
        opacity: 0.7,
    },
    preferencesView: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    preferencesEdit: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    preferenceItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    preferenceLabel: {
        fontWeight: 600,
        minWidth: '150px',
    },
    label: {
        fontWeight: 600,
        minWidth: '150px',
    },
    input: {
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid rgba(148, 163, 184, 0.4)',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        color: 'var(--color-text)',
        fontSize: '1rem',
        width: '80px',
    },
    inputLabel: {
        opacity: 0.7,
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
    },
    checkbox: {
        width: '18px',
        height: '18px',
        cursor: 'pointer',
    },
    buttonRow: {
        display: 'flex',
        gap: '12px',
        marginTop: '8px',
    },
    saveButton: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-primary-text)',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 600,
    },
    cancelButton: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: '1px solid rgba(148, 163, 184, 0.4)',
        backgroundColor: 'transparent',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 600,
    },
    editButton: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: '1px solid rgba(148, 163, 184, 0.4)',
        backgroundColor: 'transparent',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 600,
        alignSelf: 'flex-start',
    },
    srsInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    pathsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    pathItem: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    pathName: {
        fontWeight: 600,
    },
    pathProgress: {
        opacity: 0.7,
    },
};

