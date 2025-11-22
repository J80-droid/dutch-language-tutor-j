import React, { useState, useRef } from 'react';
import { recordAndTranscribe, analyzeSpeech, type SpeechAnalysisResult } from '@/services/speechAnalysis';

interface SpeechExerciseProps {
    prompt: string;
    expectedText?: string;
    onComplete?: (result: SpeechAnalysisResult) => void;
}

export const SpeechExercise: React.FC<SpeechExerciseProps> = ({ prompt, expectedText, onComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [analysis, setAnalysis] = useState<SpeechAnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStartRecording = async () => {
        setError(null);
        setIsRecording(true);
        setTranscript('');

        try {
            const result = await recordAndTranscribe();
            setTranscript(result);
            setIsRecording(false);

            // Analyseer direct
            setIsAnalyzing(true);
            const analysisResult = await analyzeSpeech(result, expectedText);
            setAnalysis(analysisResult);
            setIsAnalyzing(false);

            if (onComplete) {
                onComplete(analysisResult);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fout bij opnemen');
            setIsRecording(false);
            setIsAnalyzing(false);
        }
    };

    const handleStopRecording = () => {
        setIsRecording(false);
    };

    return (
        <div style={styles.container}>
            <div style={styles.promptCard}>
                <h3 style={styles.promptTitle}>Spraakopdracht</h3>
                <p style={styles.promptText}>{prompt}</p>
                {expectedText && (
                    <div style={styles.expectedText}>
                        <strong>Probeer te zeggen:</strong> {expectedText}
                    </div>
                )}
            </div>

            <div style={styles.recordingSection}>
                {!isRecording && !transcript && (
                    <button
                        type="button"
                        onClick={handleStartRecording}
                        style={styles.recordButton}
                    >
                        🎤 Start Opname
                    </button>
                )}

                {isRecording && (
                    <div style={styles.recordingIndicator}>
                        <div style={styles.recordingDot} />
                        <span>Opname bezig... Klik om te stoppen</span>
                        <button
                            type="button"
                            onClick={handleStopRecording}
                            style={styles.stopButton}
                        >
                            Stop
                        </button>
                    </div>
                )}

                {transcript && (
                    <div style={styles.transcriptCard}>
                        <h4>Wat je zei:</h4>
                        <p style={styles.transcript}>{transcript}</p>
                    </div>
                )}

                {isAnalyzing && (
                    <div style={styles.analyzing}>Analyseren...</div>
                )}
            </div>

            {error && (
                <div style={styles.errorBox}>{error}</div>
            )}

            {analysis && (
                <div style={styles.analysisCard}>
                    <div style={styles.analysisHeader}>
                        <h3>Analyse Resultaat</h3>
                        <div style={styles.overallScore}>
                            {analysis.overallScore}%
                        </div>
                    </div>

                    <div style={styles.scoresGrid}>
                        <div style={styles.scoreItem}>
                            <div style={styles.scoreLabel}>Woordenschat</div>
                            <div style={styles.scoreValue}>{analysis.vocabularyScore}%</div>
                        </div>
                        <div style={styles.scoreItem}>
                            <div style={styles.scoreLabel}>Vloeiendheid</div>
                            <div style={styles.scoreValue}>{analysis.fluencyScore}%</div>
                        </div>
                        <div style={styles.scoreItem}>
                            <div style={styles.scoreLabel}>Grammatica</div>
                            <div style={styles.scoreValue}>{analysis.grammarScore}%</div>
                        </div>
                    </div>

                    <div style={styles.feedbackSection}>
                        <h4>Feedback:</h4>
                        {analysis.feedback.vocabulary.length > 0 && (
                            <div>
                                <strong>Woordenschat:</strong> {analysis.feedback.vocabulary.join(', ')}
                            </div>
                        )}
                        {analysis.feedback.fluency.length > 0 && (
                            <div>
                                <strong>Vloeiendheid:</strong> {analysis.feedback.fluency.join(', ')}
                            </div>
                        )}
                        {analysis.feedback.grammar.length > 0 && (
                            <div>
                                <strong>Grammatica:</strong> {analysis.feedback.grammar.join(', ')}
                            </div>
                        )}
                    </div>

                    {analysis.suggestions.length > 0 && (
                        <div style={styles.suggestionsSection}>
                            <h4>Suggesties:</h4>
                            <ul>
                                {analysis.suggestions.map((suggestion, idx) => (
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
    expectedText: {
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        fontSize: '0.9rem',
        marginTop: '12px',
    },
    recordingSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '32px',
        borderRadius: '12px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    recordButton: {
        padding: '16px 32px',
        borderRadius: '12px',
        border: 'none',
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-primary-text)',
        fontSize: '1.2rem',
        fontWeight: 600,
        cursor: 'pointer',
    },
    recordingIndicator: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    recordingDot: {
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: '#f87171',
        animation: 'pulse 1s infinite',
    },
    stopButton: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid rgba(248, 113, 113, 0.4)',
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        color: '#f87171',
        cursor: 'pointer',
    },
    transcriptCard: {
        width: '100%',
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
    },
    transcript: {
        margin: '8px 0 0 0',
        fontSize: '1rem',
        lineHeight: 1.6,
    },
    analyzing: {
        fontSize: '0.9rem',
        opacity: 0.7,
    },
    errorBox: {
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        border: '1px solid rgba(248, 113, 113, 0.3)',
        color: '#f87171',
    },
    analysisCard: {
        padding: '24px',
        borderRadius: '12px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    analysisHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    overallScore: {
        fontSize: '2rem',
        fontWeight: 700,
        color: 'var(--color-primary)',
    },
    scoresGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '20px',
    },
    scoreItem: {
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        textAlign: 'center',
    },
    scoreLabel: {
        fontSize: '0.9rem',
        opacity: 0.7,
        marginBottom: '8px',
    },
    scoreValue: {
        fontSize: '1.5rem',
        fontWeight: 700,
    },
    feedbackSection: {
        marginBottom: '20px',
    },
    suggestionsSection: {
        marginTop: '20px',
    },
};

