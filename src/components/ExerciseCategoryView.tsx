import React, { useState, useMemo } from 'react';
import { EXTRA_EXERCISES, type ExtraExerciseId } from '@/data/extraExercises';
import type { ExtraExercise } from '@/data/extraExercises';

interface ExerciseCategoryViewProps {
    onSelectExercise: (exerciseId: ExtraExerciseId) => void;
    selectedExerciseId?: ExtraExerciseId;
}

type Category = 'grammar' | 'vocabulary' | 'pragmatics' | 'pronunciation' | 'all';

const CATEGORIES: Record<Category, { name: string; exerciseIds: ExtraExerciseId[] }> = {
    all: {
        name: 'Alle Oefeningen',
        exerciseIds: EXTRA_EXERCISES.map(e => e.id),
    },
    grammar: {
        name: 'Grammatica',
        exerciseIds: [
            'de-het-swipe',
            'de-het-memory',
            'de-het-contextual',
            'sentence-jigsaw',
            'inversion-practice',
            'subordinate-clause-sov',
            'perfectum-practice',
            'imperfectum-practice',
            'adjective-declension',
            'er-word-practice',
            'plural-forms',
            'diminutives',
            'prepositions',
            'question-formation',
            'negation',
            'modal-verbs',
            'conditionals',
            'passive-voice',
            'relative-clauses',
            'spelling-rules',
            'punctuation',
        ] as ExtraExerciseId[],
    },
    vocabulary: {
        name: 'Woordenschat',
        exerciseIds: [
            'idioms-context',
            'phrasal-verbs',
            'compound-words',
            'synonyms-antonyms',
            'word-formation',
            'collocations',
            'cloze-test',
        ] as ExtraExerciseId[],
    },
    pragmatics: {
        name: 'Pragmatiek & Register',
        exerciseIds: [
            'modal-particles',
            'speech-acts',
            'social-scripts',
            'register-switching',
            'conversation-starters',
            'cultural-context',
        ] as ExtraExerciseId[],
    },
    pronunciation: {
        name: 'Uitspraak',
        exerciseIds: [
            'minimal-pairs',
            'pronunciation-feedback',
            'voice-comparison',
            'accent-reduction',
        ] as ExtraExerciseId[],
    },
};

export const ExerciseCategoryView: React.FC<ExerciseCategoryViewProps> = ({
    onSelectExercise,
    selectedExerciseId,
}) => {
    const [selectedCategory, setSelectedCategory] = useState<Category>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredExercises = useMemo(() => {
        const categoryExercises = CATEGORIES[selectedCategory].exerciseIds
            .map(id => EXTRA_EXERCISES.find(e => e.id === id))
            .filter((e): e is ExtraExercise => e !== undefined);

        if (!searchQuery.trim()) {
            return categoryExercises;
        }

        const query = searchQuery.toLowerCase();
        return categoryExercises.filter(
            exercise =>
                exercise.title.toLowerCase().includes(query) ||
                exercise.focus.toLowerCase().includes(query)
        );
    }, [selectedCategory, searchQuery]);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Oefeningen</h2>
                <input
                    type="text"
                    placeholder="Zoek oefeningen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={styles.searchInput}
                />
            </div>

            <div style={styles.categories}>
                {(Object.keys(CATEGORIES) as Category[]).map(category => (
                    <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedCategory(category)}
                        style={{
                            ...styles.categoryButton,
                            ...(selectedCategory === category ? styles.categoryButtonActive : {}),
                        }}
                    >
                        {CATEGORIES[category].name}
                        <span style={styles.categoryCount}>
                            ({CATEGORIES[category].exerciseIds.length})
                        </span>
                    </button>
                ))}
            </div>

            <div style={styles.exercisesGrid}>
                {filteredExercises.map(exercise => {
                    const isSelected = exercise.id === selectedExerciseId;
                    return (
                        <button
                            key={exercise.id}
                            type="button"
                            onClick={() => onSelectExercise(exercise.id)}
                            style={{
                                ...styles.exerciseCard,
                                ...(isSelected ? styles.exerciseCardSelected : {}),
                            }}
                        >
                            <h3 style={styles.exerciseTitle}>{exercise.title}</h3>
                            <p style={styles.exerciseFocus}>{exercise.focus}</p>
                        </button>
                    );
                })}
            </div>

            {filteredExercises.length === 0 && (
                <div style={styles.emptyState}>
                    Geen oefeningen gevonden voor "{searchQuery}"
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
    },
    title: {
        margin: 0,
        fontSize: '1.5rem',
        fontWeight: 700,
    },
    searchInput: {
        flex: 1,
        minWidth: '200px',
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid rgba(148, 163, 184, 0.4)',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        color: 'var(--color-text)',
        fontSize: '0.95rem',
    },
    categories: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
    },
    categoryButton: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid rgba(148, 163, 184, 0.3)',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontSize: '0.9rem',
        transition: 'background-color 0.2s ease',
    },
    categoryButtonActive: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 0.4)',
    },
    categoryCount: {
        fontSize: '0.8rem',
        opacity: 0.7,
        marginLeft: '4px',
    },
    exercisesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '16px',
    },
    exerciseCard: {
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    exerciseCardSelected: {
        borderColor: 'rgba(59, 130, 246, 0.6)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
    },
    exerciseTitle: {
        margin: '0 0 8px 0',
        fontSize: '1rem',
        fontWeight: 600,
    },
    exerciseFocus: {
        margin: 0,
        fontSize: '0.85rem',
        opacity: 0.7,
    },
    emptyState: {
        textAlign: 'center',
        padding: '48px',
        opacity: 0.7,
    },
};

