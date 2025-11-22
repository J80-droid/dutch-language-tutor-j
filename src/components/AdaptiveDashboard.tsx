import React, { useState, useEffect } from 'react';
import type { WeakPoint, AdaptiveRecommendation } from '@/services/adaptiveLearning';
import { identifyWeakPoints, generateRecommendations } from '@/services/adaptiveLearning';
import type { CEFRLevel } from '@/types';
import { EXTRA_EXERCISES } from '@/data/extraExercises';

interface AdaptiveDashboardProps {
    userLevel: CEFRLevel;
    onSelectExercise?: (exerciseId: string) => void;
}

export const AdaptiveDashboard: React.FC<AdaptiveDashboardProps> = ({ userLevel, onSelectExercise }) => {
    const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);
    const [recommendations, setRecommendations] = useState<AdaptiveRecommendation[]>([]);

    useEffect(() => {
        const weak = identifyWeakPoints();
        const recs = generateRecommendations(userLevel, 5);
        setWeakPoints(weak);
        setRecommendations(recs);
    }, [userLevel]);

    const getExerciseTitle = (exerciseId: string) => {
        const exercise = EXTRA_EXERCISES.find(e => e.id === exerciseId);
        return exercise?.title || exerciseId;
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Adaptief Leren Dashboard</h2>

            {weakPoints.length > 0 ? (
                <>
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Zwakke Punten</h3>
                        <div style={styles.weakPointsList}>
                            {weakPoints.slice(0, 5).map((weakPoint, index) => (
                                <div key={index} style={styles.weakPointCard}>
                                    <div style={styles.weakPointHeader}>
                                        <span style={styles.weakPointTopic}>
                                            {getExerciseTitle(weakPoint.exerciseId)}
                                        </span>
                                        <span style={styles.weakPointRate}>
                                            {Math.round(weakPoint.errorRate * 100)}% fout
                                        </span>
                                    </div>
                                    <div style={styles.progressBar}>
                                        <div
                                            style={{
                                                ...styles.progressFill,
                                                width: `${weakPoint.errorRate * 100}%`,
                                                backgroundColor: weakPoint.errorRate > 0.5 
                                                    ? 'rgba(248, 113, 113, 0.6)' 
                                                    : 'rgba(251, 191, 36, 0.6)',
                                            }}
                                        />
                                    </div>
                                    {onSelectExercise && (
                                        <button
                                            type="button"
                                            onClick={() => onSelectExercise(weakPoint.exerciseId)}
                                            style={styles.practiceButton}
                                        >
                                            Oefenen
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Aanbevolen Oefeningen</h3>
                        <div style={styles.recommendationsList}>
                            {recommendations.map((rec, index) => (
                                <div key={index} style={styles.recommendationCard}>
                                    <div style={styles.recommendationHeader}>
                                        <span style={styles.recommendationTitle}>
                                            {getExerciseTitle(rec.exerciseId)}
                                        </span>
                                        <span style={styles.priorityBadge}>
                                            Prioriteit: {Math.round(rec.priority)}
                                        </span>
                                    </div>
                                    <p style={styles.recommendationReason}>{rec.reason}</p>
                                    {onSelectExercise && (
                                        <button
                                            type="button"
                                            onClick={() => onSelectExercise(rec.exerciseId)}
                                            style={styles.startButton}
                                        >
                                            Start Oefening
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div style={styles.emptyState}>
                    <p>Nog geen zwakke punten geïdentificeerd.</p>
                    <p>Begin met oefenen om gepersonaliseerde aanbevelingen te krijgen!</p>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px',
    },
    title: {
        margin: 0,
        fontSize: '1.5rem',
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
    weakPointsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    weakPointCard: {
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    weakPointHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
    },
    weakPointTopic: {
        fontSize: '1rem',
        fontWeight: 600,
    },
    weakPointRate: {
        fontSize: '0.9rem',
        color: 'rgba(248, 113, 113, 1)',
        fontWeight: 600,
    },
    progressBar: {
        width: '100%',
        height: '6px',
        borderRadius: '3px',
        backgroundColor: 'rgba(148, 163, 184, 0.2)',
        marginBottom: '12px',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        transition: 'width 0.3s ease',
    },
    practiceButton: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 600,
    },
    recommendationsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    recommendationCard: {
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
    },
    recommendationHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
    },
    recommendationTitle: {
        fontSize: '1rem',
        fontWeight: 600,
    },
    priorityBadge: {
        fontSize: '0.8rem',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
    },
    recommendationReason: {
        margin: '0 0 12px 0',
        fontSize: '0.9rem',
        opacity: 0.8,
    },
    startButton: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-primary-text)',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 600,
    },
    emptyState: {
        textAlign: 'center',
        padding: '48px',
        opacity: 0.7,
    },
};

