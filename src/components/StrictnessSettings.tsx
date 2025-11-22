import React from 'react';
import type { FeedbackAspect, FeedbackStrictnessSettings, StrictnessLevel } from '../types';

interface StrictnessSettingsProps {
    value: FeedbackStrictnessSettings;
    onChange: (aspect: FeedbackAspect, level: StrictnessLevel) => void;
    onReset?: () => void;
}

const ASPECT_LABELS: Record<FeedbackAspect, { title: string; description: string }> = {
    grammar: {
        title: 'Grammatica',
        description: 'Zinsbouw, werkwoordstijden en congruentie.',
    },
    pronunciation: {
        title: 'Uitspraak',
        description: 'Klanken, klemtoon en intonatie.',
    },
    fluency: {
        title: 'Vloeiendheid',
        description: 'Tempo, ritme en verbindingswoorden.',
    },
    vocabulary: {
        title: 'Woordenschat',
        description: 'Woordkeuze, collocaties en hergebruik.',
    },
    tone: {
        title: 'Toon & beleefdheid',
        description: 'Register, cultuur en gepaste formuleringen.',
    },
};

const LEVEL_LABELS: Record<StrictnessLevel, string> = {
    1: 'Zacht',
    2: 'Mild',
    3: 'Normaal',
    4: 'Streng',
    5: 'Intens',
};

const StrictnessSettings: React.FC<StrictnessSettingsProps> = ({ value, onChange, onReset }) => {
    return (
        <section style={styles.container}>
            <header style={styles.header}>
                <div>
                    <h3 style={styles.heading}>Correctiestrictheid</h3>
                    <p style={styles.subheading}>
                        Stel in hoe streng de tutor corrigeert per feedbackaspect (1 = zacht, 5 = intens).
                    </p>
                </div>
                {onReset && (
                    <button type="button" style={styles.resetButton} onClick={onReset}>
                        Herstel standaard
                    </button>
                )}
            </header>
            <div style={styles.list}>
                {(Object.keys(ASPECT_LABELS) as FeedbackAspect[]).map(aspect => {
                    const currentLevel = value[aspect];
                    const metadata = ASPECT_LABELS[aspect];
                    return (
                        <div key={aspect} style={styles.item}>
                            <div style={styles.itemHeader}>
                                <div>
                                    <div style={styles.itemTitle}>{metadata.title}</div>
                                    <div style={styles.itemDescription}>{metadata.description}</div>
                                </div>
                                <span style={styles.levelBadge}>{LEVEL_LABELS[currentLevel]}</span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={5}
                                step={1}
                                value={currentLevel}
                                onChange={event => {
                                    const parsed = Number(event.target.value) as StrictnessLevel;
                                    onChange(aspect, parsed);
                                }}
                                style={styles.slider}
                                aria-label={`Strictheid voor ${metadata.title}`}
                            />
                            <div style={styles.scale}>
                                {[1, 2, 3, 4, 5].map(level => (
                                    <span
                                        key={level}
                                        style={{
                                            ...styles.scaleMark,
                                            ...(level === currentLevel ? styles.scaleMarkActive : {}),
                                        }}
                                    >
                                        {level}
                                    </span>
                                ))}
                            </div>
                        </div>
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
        gap: '16px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px',
    },
    heading: {
        margin: 0,
        fontSize: '1rem',
        fontWeight: 600,
    },
    subheading: {
        margin: '4px 0 0',
        fontSize: '0.85rem',
        opacity: 0.75,
    },
    resetButton: {
        border: '1px solid var(--color-border)',
        background: 'transparent',
        color: 'var(--color-text)',
        borderRadius: '999px',
        padding: '6px 12px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        transition: 'border-color 0.2s ease, color 0.2s ease',
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
    },
    item: {
        padding: '12px 14px',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        background: 'var(--color-secondary)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    itemHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
    },
    itemTitle: {
        fontWeight: 600,
        fontSize: '0.95rem',
    },
    itemDescription: {
        fontSize: '0.8rem',
        opacity: 0.7,
    },
    levelBadge: {
        fontSize: '0.75rem',
        padding: '2px 8px',
        borderRadius: '999px',
        background: 'rgba(59, 130, 246, 0.15)',
        color: 'var(--color-primary)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
    },
    slider: {
        width: '100%',
    },
    scale: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        opacity: 0.6,
    },
    scaleMark: {
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        border: '1px solid transparent',
        transition: 'border-color 0.2s ease, color 0.2s ease',
    },
    scaleMarkActive: {
        borderColor: 'var(--color-primary)',
        color: 'var(--color-primary)',
        fontWeight: 600,
    },
};

export default StrictnessSettings;

