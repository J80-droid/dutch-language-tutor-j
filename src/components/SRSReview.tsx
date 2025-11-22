import React, { useState, useEffect } from 'react';
import type { SRSItem } from '@/services/spacedRepetition';
import { updateSRSItem, saveSRSItems, loadSRSItems } from '@/services/spacedRepetition';

interface SRSReviewProps {
    onComplete?: () => void;
}

export const SRSReview: React.FC<SRSReviewProps> = ({ onComplete }) => {
    const [items, setItems] = useState<SRSItem[]>([]);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [reviewedCount, setReviewedCount] = useState(0);

    useEffect(() => {
        const loaded = loadSRSItems();
        const forReview = loaded.filter(item => item.nextReviewDate <= Date.now());
        setItems(forReview);
    }, []);

    const currentItem = items[currentItemIndex];

    const handleQuality = (quality: number) => {
        if (!currentItem) return;

        const result = updateSRSItem(currentItem, quality);
        const updatedItems = items.map((item, idx) => 
            idx === currentItemIndex ? result.item : item
        );
        
        setItems(updatedItems);
        saveSRSItems(updatedItems);
        setReviewedCount(prev => prev + 1);
        setShowAnswer(false);

        if (currentItemIndex < items.length - 1) {
            setCurrentItemIndex(prev => prev + 1);
        } else {
            // Alle items gereviewd
            if (onComplete) {
                onComplete();
            }
        }
    };

    if (items.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.emptyState}>
                    <h3>Geen items om te reviewen</h3>
                    <p>Alle woorden zijn up-to-date! Kom later terug voor nieuwe reviews.</p>
                </div>
            </div>
        );
    }

    if (!currentItem) {
        return (
            <div style={styles.container}>
                <div style={styles.emptyState}>
                    <h3>Review voltooid!</h3>
                    <p>Je hebt {reviewedCount} items gereviewd.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.progress}>
                {currentItemIndex + 1} / {items.length}
            </div>

            <div style={styles.card}>
                <div style={styles.word}>{currentItem.word}</div>
                
                {showAnswer ? (
                    <div style={styles.answer}>
                        {currentItem.translation && (
                            <div style={styles.translation}>
                                <strong>Vertaling:</strong> {currentItem.translation}
                            </div>
                        )}
                        {currentItem.example && (
                            <div style={styles.example}>
                                <strong>Voorbeeld:</strong> {currentItem.example}
                            </div>
                        )}
                        <div style={styles.qualityButtons}>
                            <button
                                type="button"
                                onClick={() => handleQuality(0)}
                                style={{ ...styles.qualityButton, ...styles.quality0 }}
                            >
                                Vergeten
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuality(1)}
                                style={{ ...styles.qualityButton, ...styles.quality1 }}
                            >
                                Heel moeilijk
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuality(2)}
                                style={{ ...styles.qualityButton, ...styles.quality2 }}
                            >
                                Moeilijk
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuality(3)}
                                style={{ ...styles.qualityButton, ...styles.quality3 }}
                            >
                                Goed
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuality(4)}
                                style={{ ...styles.qualityButton, ...styles.quality4 }}
                            >
                                Gemakkelijk
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuality(5)}
                                style={{ ...styles.qualityButton, ...styles.quality5 }}
                            >
                                Perfect
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowAnswer(true)}
                        style={styles.showAnswerButton}
                    >
                        Toon antwoord
                    </button>
                )}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        padding: '24px',
    },
    progress: {
        fontSize: '0.9rem',
        opacity: 0.7,
    },
    card: {
        width: '100%',
        maxWidth: '500px',
        padding: '32px',
        borderRadius: '16px',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        textAlign: 'center',
    },
    word: {
        fontSize: '2rem',
        fontWeight: 700,
        marginBottom: '24px',
        color: 'var(--color-text)',
    },
    answer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    translation: {
        fontSize: '1.2rem',
        marginBottom: '12px',
    },
    example: {
        fontSize: '1rem',
        fontStyle: 'italic',
        opacity: 0.8,
    },
    qualityButtons: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginTop: '20px',
    },
    qualityButton: {
        padding: '12px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 600,
        transition: 'transform 0.1s ease',
    },
    quality0: { backgroundColor: 'rgba(248, 113, 113, 0.2)', color: '#f87171' },
    quality1: { backgroundColor: 'rgba(251, 146, 60, 0.2)', color: '#fb923c' },
    quality2: { backgroundColor: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' },
    quality3: { backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' },
    quality4: { backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' },
    quality5: { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' },
    showAnswerButton: {
        padding: '12px 24px',
        borderRadius: '8px',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 600,
    },
    emptyState: {
        textAlign: 'center',
        padding: '32px',
    },
};

