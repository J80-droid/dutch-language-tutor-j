import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { LearningGoal, LEARNING_GOALS, LEARNING_GOAL_METADATA } from '../types';

interface GoalSelectorProps {
    selectedGoals: LearningGoal[];
    onUpdateGoals: Dispatch<SetStateAction<LearningGoal[]>>;
    label?: string;
    minSelections?: number;
}

const GoalSelector: React.FC<GoalSelectorProps> = ({
    selectedGoals,
    onUpdateGoals,
    label = 'Leerdoelen',
    minSelections = 1,
}) => {
    const toggleGoal = (goal: LearningGoal) => {
        onUpdateGoals(prev => {
            const alreadySelected = prev.includes(goal);
            if (alreadySelected && prev.length <= minSelections) {
                return prev;
            }

            if (alreadySelected) {
                return prev.filter(item => item !== goal);
            }

            const next = [...prev, goal];
            next.sort((a, b) => LEARNING_GOALS.indexOf(a) - LEARNING_GOALS.indexOf(b));
            return next;
        });
    };

    const isDisabled = (goal: LearningGoal) =>
        selectedGoals.includes(goal) && selectedGoals.length <= minSelections;

    return (
        <section style={styles.container} aria-label={label}>
            <header style={styles.headerRow}>
                <h3 style={styles.heading}>{label}</h3>
                <span style={styles.selectionHint}>
                    {selectedGoals.length} geselecteerd
                </span>
            </header>
            <div style={styles.goalGrid} role="group">
                {LEARNING_GOALS.map(goal => {
                    const metadata = LEARNING_GOAL_METADATA[goal];
                    const active = selectedGoals.includes(goal);
                    return (
                        <button
                            key={goal}
                            type="button"
                            onClick={() => toggleGoal(goal)}
                            disabled={isDisabled(goal)}
                            style={{
                                ...styles.goalCard,
                                ...(active ? styles.goalCardActive : {}),
                                ...(isDisabled(goal) ? styles.goalCardDisabled : {}),
                            }}
                            aria-pressed={active}
                        >
                            <div style={styles.goalHeader}>
                                <span style={styles.goalLabel}>{metadata.label}</span>
                                {active && <span style={styles.activePill}>actief</span>}
                            </div>
                            <p style={styles.goalDescription}>{metadata.description}</p>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
    },
    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '12px',
    },
    heading: {
        margin: 0,
        fontSize: '1rem',
        fontWeight: 600,
    },
    selectionHint: {
        fontSize: '0.8rem',
        opacity: 0.7,
    },
    goalGrid: {
        display: 'grid',
        gap: '12px',
    },
    goalCard: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '14px 16px',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        background: 'var(--color-secondary)',
        color: 'var(--color-text)',
        cursor: 'pointer',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
        textAlign: 'left',
    },
    goalCardActive: {
        borderColor: 'var(--color-primary)',
        boxShadow: '0 10px 26px rgba(59, 130, 246, 0.25)',
        transform: 'translateY(-1px)',
    },
    goalCardDisabled: {
        cursor: 'not-allowed',
        opacity: 0.7,
    },
    goalHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '6px',
    },
    goalLabel: {
        fontWeight: 700,
        fontSize: '1rem',
    },
    activePill: {
        fontSize: '0.7rem',
        padding: '2px 6px',
        borderRadius: '999px',
        background: 'var(--color-primary)',
        color: 'var(--color-primary-text)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    },
    goalDescription: {
        fontSize: '0.88rem',
        opacity: 0.75,
        margin: 0,
        lineHeight: 1.4,
    },
};

export default GoalSelector;
