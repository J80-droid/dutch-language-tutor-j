import React, { useState, useEffect } from 'react';
import type { LearningPath } from '@/services/learningPaths';
import { LEARNING_PATHS, loadLearningPathProgress, saveLearningPathProgress } from '@/services/learningPaths';

interface LearningPathViewProps {
    pathId?: string;
    onSelectExercise?: (exerciseId: string) => void;
}

export const LearningPathView: React.FC<LearningPathViewProps> = ({ pathId, onSelectExercise }) => {
    const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
    const [paths, setPaths] = useState<LearningPath[]>([]);

    useEffect(() => {
        // Load all paths with progress
        const loadedPaths = LEARNING_PATHS.map(path => {
            const progress = loadLearningPathProgress(path.id);
            return progress || path;
        });
        setPaths(loadedPaths);

        if (pathId) {
            const path = loadedPaths.find(p => p.id === pathId);
            if (path) setSelectedPath(path);
        }
    }, [pathId]);

    const getProgressPercentage = (path: LearningPath) => {
        const completed = path.steps.filter(s => s.completed).length;
        return path.steps.length > 0 ? Math.round((completed / path.steps.length) * 100) : 0;
    };

    if (selectedPath) {
        const progress = getProgressPercentage(selectedPath);
        const nextStep = selectedPath.steps.find(s => !s.completed);

        return (
            <div style={styles.container}>
                <button
                    type="button"
                    onClick={() => setSelectedPath(null)}
                    style={styles.backButton}
                >
                    ← Terug naar leerpaden
                </button>

                <h2 style={styles.title}>{selectedPath.name}</h2>
                <p style={styles.description}>{selectedPath.description}</p>

                <div style={styles.progressSection}>
                    <div style={styles.progressBar}>
                        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                    </div>
                    <div style={styles.progressText}>{progress}% voltooid</div>
                </div>

                {nextStep && (
                    <div style={styles.nextStepCard}>
                        <h3 style={styles.nextStepTitle}>Volgende Stap</h3>
                        <h4>{nextStep.title}</h4>
                        <p>{nextStep.description}</p>
                        <div style={styles.exercisesList}>
                            {nextStep.exerciseIds.map(exId => (
                                <button
                                    key={exId}
                                    type="button"
                                    onClick={() => onSelectExercise?.(exId)}
                                    style={styles.exerciseButton}
                                >
                                    {exId}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div style={styles.stepsSection}>
                    <h3 style={styles.sectionTitle}>Stappen</h3>
                    {selectedPath.steps.map((step, index) => (
                        <div
                            key={step.id}
                            style={{
                                ...styles.stepCard,
                                ...(step.completed ? styles.stepCardCompleted : {}),
                            }}
                        >
                            <div style={styles.stepHeader}>
                                <div style={styles.stepNumber}>{index + 1}</div>
                                <div style={styles.stepContent}>
                                    <h4 style={styles.stepTitle}>{step.title}</h4>
                                    <p style={styles.stepDescription}>{step.description}</p>
                                </div>
                                {step.completed && <span style={styles.completedBadge}>✓</span>}
                            </div>
                            <div style={styles.stepExercises}>
                                {step.exerciseIds.map(exId => (
                                    <span key={exId} style={styles.exerciseTag}>
                                        {exId}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Leerpaden</h2>
            <p style={styles.subtitle}>Kies een leerpad om gestructureerd te leren</p>

            <div style={styles.pathsGrid}>
                {paths.map(path => {
                    const progress = getProgressPercentage(path);
                    return (
                        <div
                            key={path.id}
                            style={styles.pathCard}
                            onClick={() => setSelectedPath(path)}
                        >
                            <h3 style={styles.pathName}>{path.name}</h3>
                            <p style={styles.pathDescription}>{path.description}</p>
                            <div style={styles.pathProgress}>
                                <div style={styles.pathProgressBar}>
                                    <div style={{ ...styles.pathProgressFill, width: `${progress}%` }} />
                                </div>
                                <span style={styles.pathProgressText}>{progress}%</span>
                            </div>
                            <div style={styles.pathMeta}>
                                <span>Niveau: {path.targetLevel}</span>
                                <span>{path.steps.length} stappen</span>
                            </div>
                        </div>
                    );
                })}
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
    },
    backButton: {
        alignSelf: 'flex-start',
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid rgba(148, 163, 184, 0.4)',
        backgroundColor: 'transparent',
        color: 'var(--color-text)',
        cursor: 'pointer',
    },
    title: {
        margin: 0,
        fontSize: '1.5rem',
        fontWeight: 700,
    },
    description: {
        fontSize: '1rem',
        opacity: 0.8,
    },
    subtitle: {
        fontSize: '0.95rem',
        opacity: 0.7,
    },
    progressSection: {
        padding: '20px',
        borderRadius: '12px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    progressBar: {
        width: '100%',
        height: '12px',
        borderRadius: '6px',
        backgroundColor: 'rgba(148, 163, 184, 0.2)',
        overflow: 'hidden',
        marginBottom: '8px',
    },
    progressFill: {
        height: '100%',
        backgroundColor: 'var(--color-primary)',
        transition: 'width 0.3s ease',
    },
    progressText: {
        textAlign: 'center',
        fontSize: '0.9rem',
        fontWeight: 600,
    },
    nextStepCard: {
        padding: '20px',
        borderRadius: '12px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
    },
    nextStepTitle: {
        margin: '0 0 12px 0',
        fontSize: '0.9rem',
        textTransform: 'uppercase',
        opacity: 0.7,
    },
    exercisesList: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '12px',
    },
    exerciseButton: {
        padding: '6px 12px',
        borderRadius: '6px',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontSize: '0.85rem',
    },
    stepsSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    sectionTitle: {
        margin: 0,
        fontSize: '1.2rem',
        fontWeight: 600,
    },
    stepCard: {
        padding: '20px',
        borderRadius: '12px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    stepCardCompleted: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    stepHeader: {
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
    },
    stepNumber: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        flexShrink: 0,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        margin: '0 0 4px 0',
        fontSize: '1.1rem',
        fontWeight: 600,
    },
    stepDescription: {
        margin: 0,
        fontSize: '0.9rem',
        opacity: 0.8,
    },
    completedBadge: {
        fontSize: '1.5rem',
        color: '#22c55e',
    },
    stepExercises: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '12px',
    },
    exerciseTag: {
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        fontSize: '0.8rem',
    },
    pathsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
    },
    pathCard: {
        padding: '20px',
        borderRadius: '12px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    pathName: {
        margin: '0 0 8px 0',
        fontSize: '1.2rem',
        fontWeight: 600,
    },
    pathDescription: {
        margin: '0 0 16px 0',
        fontSize: '0.9rem',
        opacity: 0.8,
    },
    pathProgress: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px',
    },
    pathProgressBar: {
        flex: 1,
        height: '8px',
        borderRadius: '4px',
        backgroundColor: 'rgba(148, 163, 184, 0.2)',
        overflow: 'hidden',
    },
    pathProgressFill: {
        height: '100%',
        backgroundColor: 'var(--color-primary)',
    },
    pathProgressText: {
        fontSize: '0.85rem',
        fontWeight: 600,
        minWidth: '40px',
    },
    pathMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.85rem',
        opacity: 0.7,
    },
};

