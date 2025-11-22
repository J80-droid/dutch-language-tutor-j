import React, { useState } from 'react';
import { WritingExerciseComponent } from '@/components/WritingExercise';
import type { WritingExercise, WritingFeedback } from '@/services/writingCorrection';
import { useSessionState } from '../providers/SessionProvider';
import { useUIState } from '../providers/UIProvider';

export const WritingExerciseContainer: React.FC = () => {
    const { selectedLevel } = useSessionState();
    const { setView } = useUIState();
    const [currentExercise] = useState<WritingExercise>({
        prompt: 'Schrijf een korte e-mail (50 woorden) om je ziek te melden bij je baas.',
        wordLimit: 50,
        register: 'formal',
        context: 'Je werkt op een kantoor en voelt je niet goed.',
    });

    const handleSubmit = (feedback: WritingFeedback) => {
        // Feedback wordt getoond in de component zelf
    };

    return (
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Schrijfopdracht</h1>
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
            <WritingExerciseComponent exercise={currentExercise} level={selectedLevel} onSubmit={handleSubmit} />
        </div>
    );
};

