import React from 'react';
import { LearningPathView } from '@/components/LearningPathView';
import { useUIState } from '../providers/UIProvider';

export const LearningPathContainer: React.FC = () => {
    const { setView } = useUIState();

    const handleSelectExercise = (exerciseId: string) => {
        setView('extra-practice');
        // Navigeer naar specifieke oefening zou hier kunnen worden toegevoegd
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Leerpaden</h1>
                <button
                    type="button"
                    onClick={() => setView('extra-practice')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid rgba(148, 163, 184, 0.4)',
                        backgroundColor: 'transparent',
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                    }}
                >
                    Terug
                </button>
            </div>
            <LearningPathView onSelectExercise={handleSelectExercise} />
        </div>
    );
};

