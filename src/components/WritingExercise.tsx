import React, { useState } from 'react';
import type { WritingExercise, WritingFeedback } from '@/services/writingCorrection';
import { correctWriting } from '@/services/writingCorrection';
import type { CEFRLevel } from '@/types';

interface WritingExerciseProps {
    exercise: WritingExercise;
    level: CEFRLevel;
    onSubmit?: (feedback: WritingFeedback) => void;
}

export const WritingExerciseComponent: React.FC<WritingExerciseProps> = ({ exercise, level, onSubmit }) => {
    const [text, setText] = useState('');
    const [isCorrecting, setIsCorrecting] = useState(false);
    const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
    const [error, setError] = useState<string | null>(null);

    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const wordLimit = exercise.wordLimit || 0;

    const handleSubmit = async () => {
        if (!text.trim()) {
            setError('Typ eerst je tekst voordat je deze indient.');
            return;
        }

        if (wordLimit > 0 && wordCount > wordLimit) {
            setError(`Je tekst heeft ${wordCount} woorden. Maximum is ${wordLimit} woorden.`);
            return;
        }

        setIsCorrecting(true);
        setError(null);

        try {
            const result = await correctWriting(exercise, text, level);
            setFeedback(result);
            if (onSubmit) {
                onSubmit(result);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fout bij corrigeren');
        } finally {
            setIsCorrecting(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.promptCard}>
                <h3 style={styles.promptTitle}>Schrijfopdracht</h3>
                <p style={styles.promptText}>{exercise.prompt}</p>
                {exercise.context && (
                    <div style={styles.context}>
                        <strong>Context:</strong> {exercise.context}
                    </div>
                )}
                {wordLimit > 0 && (
                    <div style={styles.wordLimit}>
                        Woordlimiet: {wordLimit} woorden
                    </div>
                )}
            </div>

            <div style={styles.editorSection}>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Typ hier je tekst..."
                    style={styles.textarea}
                    rows={10}
                />
                <div style={styles.editorFooter}>
                    <span style={styles.wordCount}>
                        {wordCount} {wordLimit > 0 ? `/ ${wordLimit}` : ''} woorden
                    </span>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isCorrecting || !text.trim()}
                        style={{
                            ...styles.submitButton,
                            ...(isCorrecting || !text.trim() ? styles.submitButtonDisabled : {}),
                        }}
                    >
                        {isCorrecting ? 'Corrigeren...' : 'Indienen voor correctie'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={styles.errorBox}>{error}</div>
            )}

            {feedback && (
                <div style={styles.feedbackCard}>
                    <div style={styles.feedbackHeader}>
                        <h3>Feedback</h3>
                        <div style={styles.scoreBadge}>
                            Score: {feedback.score}%
                        </div>
                    </div>

                    {feedback.errors.length > 0 && (
                        <div style={styles.errorsSection}>
                            <h4>Gevonden fouten:</h4>
                            {feedback.errors.map((err, idx) => (
                                <div key={idx} style={styles.errorItem}>
                                    <div style={styles.errorOriginal}>
                                        <strong>Fout:</strong> {err.original}
                                    </div>
                                    <div style={styles.errorCorrected}>
                                        <strong>Correct:</strong> {err.corrected}
                                    </div>
                                    <div style={styles.errorExplanation}>
                                        {err.explanation}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={styles.correctedTextSection}>
                        <h4>Gecorrigeerde tekst:</h4>
                        <div style={styles.correctedText}>{feedback.correctedText}</div>
                    </div>

                    {feedback.overallFeedback && (
                        <div style={styles.overallFeedback}>
                            <h4>Algemene feedback:</h4>
                            <p>{feedback.overallFeedback}</p>
                        </div>
                    )}

                    {feedback.suggestions.length > 0 && (
                        <div style={styles.suggestionsSection}>
                            <h4>Suggesties:</h4>
                            <ul style={styles.suggestionsList}>
                                {feedback.suggestions.map((suggestion, idx) => (
                                    <li key={idx}>{suggestion}</li>
                                ))}
                            </ul>
                        </div>
                    )}
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
    promptCard: {
        padding: '20px',
        borderRadius: '12px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
    },
    promptTitle: {
        margin: '0 0 12px 0',
        fontSize: '1.2rem',
        fontWeight: 600,
    },
    promptText: {
        margin: '0 0 12px 0',
        lineHeight: 1.6,
    },
    context: {
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        fontSize: '0.9rem',
        marginTop: '12px',
    },
    wordLimit: {
        marginTop: '8px',
        fontSize: '0.9rem',
        opacity: 0.7,
    },
    editorSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    textarea: {
        width: '100%',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid rgba(148, 163, 184, 0.4)',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        color: 'var(--color-text)',
        fontSize: '1rem',
        fontFamily: 'inherit',
        resize: 'vertical',
        minHeight: '200px',
    },
    editorFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    wordCount: {
        fontSize: '0.9rem',
        opacity: 0.7,
    },
    submitButton: {
        padding: '12px 24px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-primary-text)',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
    },
    submitButtonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
    errorBox: {
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        border: '1px solid rgba(248, 113, 113, 0.3)',
        color: '#f87171',
    },
    feedbackCard: {
        padding: '24px',
        borderRadius: '12px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    feedbackHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    scoreBadge: {
        padding: '8px 16px',
        borderRadius: '8px',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        color: '#22c55e',
        fontWeight: 600,
    },
    errorsSection: {
        marginBottom: '20px',
    },
    errorItem: {
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        border: '1px solid rgba(248, 113, 113, 0.2)',
        marginBottom: '8px',
    },
    errorOriginal: {
        color: '#f87171',
        marginBottom: '4px',
    },
    errorCorrected: {
        color: '#22c55e',
        marginBottom: '4px',
    },
    errorExplanation: {
        fontSize: '0.9rem',
        opacity: 0.8,
    },
    correctedTextSection: {
        marginBottom: '20px',
    },
    correctedText: {
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
    },
    overallFeedback: {
        marginBottom: '20px',
    },
    suggestionsSection: {
        marginTop: '20px',
    },
    suggestionsList: {
        margin: '8px 0 0 0',
        paddingLeft: '24px',
        lineHeight: 1.8,
    },
};

