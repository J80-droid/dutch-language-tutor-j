import React, { useState } from 'react';
import { SpeechExercise } from '@/components/SpeechExercise';
import type { SpeechAnalysisResult } from '@/services/speechAnalysis';
import { useUIState } from '../providers/UIProvider';

export const SpeechExerciseContainer: React.FC = () => {
    const { setView } = useUIState();
    const [currentPrompt] = useState('Beschrijf je woonkamer in 30 seconden.');

    const handleComplete = (result: SpeechAnalysisResult) => {
        // Resultaat wordt getoond in de component zelf
    };

    return (
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Spraakopdracht</h1>
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
            <SpeechExercise prompt={currentPrompt} onComplete={handleComplete} />
        </div>
    );
};

