import React, { useState, useEffect } from 'react';
import type { FeedbackReport as FeedbackReportType } from '@/types/exercise';
import { Confetti } from './Confetti';

interface FeedbackReportProps {
    feedback: FeedbackReportType;
    onRetry: () => void;
}

export const FeedbackReport: React.FC<FeedbackReportProps> = ({ feedback, onRetry }) => {
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        // Toon confetti als score 60% of hoger is (6/10 of hoger)
        if (feedback.score >= 60) {
            setShowConfetti(true);
            // Verberg confetti na 3 seconden
            const timer = setTimeout(() => {
                setShowConfetti(false);
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setShowConfetti(false);
        }
    }, [feedback.score]);
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'rgba(34, 197, 94, 0.2)';
        if (score >= 60) return 'rgba(251, 191, 36, 0.2)';
        return 'rgba(248, 113, 113, 0.2)';
    };

    const getScoreBorderColor = (score: number) => {
        if (score >= 80) return 'rgba(34, 197, 94, 0.5)';
        if (score >= 60) return 'rgba(251, 191, 36, 0.5)';
        return 'rgba(248, 113, 113, 0.5)';
    };

    const getScoreTextColor = (score: number) => {
        if (score >= 80) return '#4ade80';
        if (score >= 60) return '#fbbf24';
        return '#f87171';
    };

    return (
        <>
            <Confetti show={showConfetti} duration={3000} />
            <div style={styles.container}>
            <div style={{
                ...styles.scoreBox,
                backgroundColor: getScoreColor(feedback.score),
                borderColor: getScoreBorderColor(feedback.score),
            }}>
                <div style={styles.scoreHeader}>
                    <h3 style={styles.scoreTitle}>Resultaat</h3>
                    <div style={{
                        ...styles.scoreValue,
                        color: getScoreTextColor(feedback.score),
                    }}>
                        {feedback.score}%
                    </div>
                </div>
                <p style={styles.scoreText}>
                    Je hebt {feedback.correctAnswers} van de {feedback.totalQuestions} vragen correct beantwoord.
                </p>
            </div>

            <div style={styles.feedbackSection}>
                <h4 style={styles.sectionTitle}>Per-vraag feedback</h4>
                <div style={styles.questionsFeedback}>
                    {feedback.questionFeedback.map((qFeedback, index) => (
                        <div
                            key={qFeedback.questionId}
                            style={{
                                ...styles.questionFeedback,
                                borderColor: qFeedback.isCorrect 
                                    ? 'rgba(34, 197, 94, 0.4)' 
                                    : 'rgba(248, 113, 113, 0.4)',
                                backgroundColor: qFeedback.isCorrect
                                    ? 'rgba(34, 197, 94, 0.1)'
                                    : 'rgba(248, 113, 113, 0.1)',
                            }}
                        >
                            <div style={styles.feedbackHeader}>
                                <span style={styles.questionNumber}>Vraag {index + 1}</span>
                                <span style={{
                                    ...styles.correctnessBadge,
                                    color: qFeedback.isCorrect ? '#4ade80' : '#f87171',
                                    backgroundColor: qFeedback.isCorrect 
                                        ? 'rgba(34, 197, 94, 0.2)' 
                                        : 'rgba(248, 113, 113, 0.2)',
                                }}>
                                    {qFeedback.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                </span>
                            </div>
                            <div style={styles.feedbackContent}>
                                <div style={styles.answerRow}>
                                    <strong>Jouw antwoord:</strong>{' '}
                                    <span style={styles.userAnswer}>
                                        {Array.isArray(qFeedback.userAnswer) 
                                            ? qFeedback.userAnswer.join(', ') 
                                            : qFeedback.userAnswer || '(leeg)'}
                                    </span>
                                </div>
                                <div style={styles.answerRow}>
                                    <strong>Correct antwoord:</strong>{' '}
                                    <span style={styles.correctAnswer}>
                                        {(() => {
                                            const correctAns = Array.isArray(qFeedback.correctAnswer)
                                                ? qFeedback.correctAnswer.join(', ')
                                                : (qFeedback.correctAnswer || '');
                                            
                                            // Als het antwoord leeg is of een placeholder, probeer het uit de uitleg te halen
                                            if (!correctAns || correctAns.trim() === '' || correctAns === 'Antwoord niet beschikbaar') {
                                                // Probeer antwoord uit uitleg te extraheren
                                                const explMatch = qFeedback.explanation?.match(/Het correcte antwoord is:\s*(.+?)(?:\.|$)/i);
                                                if (explMatch && explMatch[1]) {
                                                    return explMatch[1].trim();
                                                }
                                                return correctAns || '(Niet beschikbaar - probeer de oefening opnieuw te genereren)';
                                            }
                                            return correctAns;
                                        })()}
                                    </span>
                                </div>
                                <div style={styles.explanation}>
                                    <strong>Uitleg:</strong> {(() => {
                                        const expl = qFeedback.explanation || `Het correcte antwoord is: ${Array.isArray(qFeedback.correctAnswer) ? qFeedback.correctAnswer.join(', ') : (qFeedback.correctAnswer || 'Niet beschikbaar')}`;
                                        
                                        // Als de uitleg alleen "Het correcte antwoord is:" bevat zonder antwoord, voeg het antwoord toe
                                        if (expl.includes('Het correcte antwoord is:') && !expl.replace('Het correcte antwoord is:', '').trim()) {
                                            const correctAns = Array.isArray(qFeedback.correctAnswer)
                                                ? qFeedback.correctAnswer.join(', ')
                                                : (qFeedback.correctAnswer || 'Niet beschikbaar');
                                            return `Het correcte antwoord is: ${correctAns}. Bekijk de vraag en opties om het juiste antwoord te vinden.`;
                                        }
                                        
                                        return expl;
                                    })()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {feedback.generalFeedback && (
                <div style={styles.generalFeedback}>
                    <h4 style={styles.sectionTitle}>Algemene feedback</h4>
                    <p style={styles.feedbackText}>{feedback.generalFeedback}</p>
                </div>
            )}

            {feedback.tips && feedback.tips.length > 0 && (
                <div style={styles.tipsSection}>
                    <h4 style={styles.sectionTitle}>Tips</h4>
                    <ul style={styles.tipsList}>
                        {feedback.tips.map((tip, index) => (
                            <li key={index} style={styles.tipItem}>{tip}</li>
                        ))}
                    </ul>
                </div>
            )}

            <button
                type="button"
                onClick={onRetry}
                style={styles.retryButton}
            >
                Opnieuw proberen
            </button>
        </div>
        </>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    scoreBox: {
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid',
        textAlign: 'center',
    },
    scoreHeader: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
    },
    scoreTitle: {
        margin: 0,
        fontSize: '1rem',
        fontWeight: 600,
        opacity: 0.9,
    },
    scoreValue: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1,
    },
    scoreText: {
        margin: 0,
        fontSize: '0.95rem',
        opacity: 0.8,
    },
    feedbackSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    sectionTitle: {
        margin: 0,
        fontSize: '1.1rem',
        fontWeight: 600,
    },
    questionsFeedback: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    questionFeedback: {
        padding: '14px',
        borderRadius: '10px',
        border: '1px solid',
    },
    feedbackHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
    },
    questionNumber: {
        fontWeight: 600,
        fontSize: '0.95rem',
    },
    correctnessBadge: {
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '0.85rem',
        fontWeight: 600,
    },
    feedbackContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    answerRow: {
        fontSize: '0.9rem',
        lineHeight: 1.6,
    },
    userAnswer: {
        fontStyle: 'italic',
        opacity: 0.9,
    },
    correctAnswer: {
        color: '#4ade80',
        fontWeight: 600,
    },
    explanation: {
        marginTop: '8px',
        padding: '10px',
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        borderRadius: '8px',
        fontSize: '0.9rem',
        lineHeight: 1.6,
    },
    generalFeedback: {
        padding: '16px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(59, 130, 246, 0.2)',
    },
    feedbackText: {
        margin: '8px 0 0 0',
        lineHeight: 1.6,
    },
    tipsSection: {
        padding: '16px',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(251, 191, 36, 0.2)',
    },
    tipsList: {
        margin: '8px 0 0 0',
        paddingLeft: '24px',
        lineHeight: 1.8,
    },
    tipItem: {
        marginBottom: '6px',
    },
    retryButton: {
        padding: '12px 24px',
        borderRadius: '12px',
        border: '1px solid rgba(148, 163, 184, 0.4)',
        backgroundColor: 'transparent',
        color: 'var(--color-text)',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background-color 0.2s ease, transform 0.1s ease',
        alignSelf: 'flex-start',
    },
};

